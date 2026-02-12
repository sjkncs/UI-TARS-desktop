/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { initIpc } from '@ui-tars/electron-ipc/main';
import { BrowserWindow, shell } from 'electron';
import { SettingStore } from '../store/setting';
import { extractDocumentTextFromBuffer } from '../utils/documentExtractor';
import { ConversationExporter } from '../utils/conversationExporter';
import type { ExportMessage, ExportOptions } from '../utils/conversationExporter';
import { exportLogs } from '../logger';

const t = initIpc.create();

/** In-memory VLM API usage statistics */
const apiStats = {
  totalCalls: 0,
  successCount: 0,
  failureCount: 0,
  totalResponseTimeMs: 0,
  lastCallAt: null as string | null,
};

export const systemRoute = t.router({
  /**
   * Check VLM API service status
   */
  'system:checkApiStatus': t.procedure.handle(async () => {
    try {
      const settings = SettingStore.getStore();
      const { vlmBaseUrl, vlmApiKey, vlmProvider } = settings;

      if (!vlmBaseUrl || !vlmApiKey) {
        return {
          status: 'not_configured',
          message: 'VLM API not configured',
          provider: vlmProvider || 'unknown',
        };
      }

      // Simple connectivity check - try to fetch the base URL
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(vlmBaseUrl, {
          method: 'HEAD',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        return {
          status: response.ok ? 'connected' : 'error',
          message: response.ok ? 'API service available' : `HTTP ${response.status}`,
          provider: vlmProvider || 'unknown',
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        return {
          status: 'disconnected',
          message: fetchError instanceof Error ? fetchError.message : 'Connection failed',
          provider: vlmProvider || 'unknown',
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        provider: 'unknown',
      };
    }
  }),

  /**
   * Toggle fullscreen mode
   */
  'system:toggleFullscreen': t.procedure.handle(async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      const isFullscreen = win.isFullScreen();
      win.setFullScreen(!isFullscreen);
      return { fullscreen: !isFullscreen };
    }
    return { fullscreen: false };
  }),

  /**
   * Get system info
   */
  'system:getInfo': t.procedure.handle(async () => {
    const win = BrowserWindow.getFocusedWindow();
    return {
      fullscreen: win?.isFullScreen() || false,
      maximized: win?.isMaximized() || false,
      platform: process.platform,
    };
  }),

  /**
   * Open external URL in default browser
   */
  'system:openExternal': t.procedure
    .input<{ url: string }>()
    .handle(async ({ input }) => {
      if (input.url && (input.url.startsWith('https://') || input.url.startsWith('http://'))) {
        await shell.openExternal(input.url);
        return { success: true };
      }
      return { success: false, error: 'Invalid URL' };
    }),

  /**
   * Get VLM API usage statistics
   */
  'system:getApiStats': t.procedure.handle(async () => {
    return {
      ...apiStats,
      avgResponseTimeMs: apiStats.totalCalls > 0
        ? Math.round(apiStats.totalResponseTimeMs / apiStats.totalCalls)
        : 0,
      successRate: apiStats.totalCalls > 0
        ? Math.round((apiStats.successCount / apiStats.totalCalls) * 100)
        : 0,
    };
  }),

  /**
   * Build the OpenAI-compatible request body for image analysis
   */
  'system:analyzeImage': t.procedure
    .input<{ imageBase64: string; question: string; mimeType?: string; stream?: boolean }>()
    .handle(async ({ input }) => {
      const settings = SettingStore.getStore();
      const { vlmBaseUrl, vlmApiKey, vlmModelName } = settings;

      if (!vlmBaseUrl || !vlmApiKey) {
        return {
          success: false,
          error: 'VLM API not configured. Please set up VLM settings first.',
        };
      }

      const startTime = Date.now();
      apiStats.totalCalls++;
      apiStats.lastCallAt = new Date().toISOString();

      const useStream = input.stream === true;

      try {
        const mime = input.mimeType || 'image/png';
        const dataUrl = input.imageBase64.startsWith('data:')
          ? input.imageBase64
          : `data:${mime};base64,${input.imageBase64}`;

        const body = {
          model: vlmModelName || 'default',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: dataUrl },
                },
                {
                  type: 'text',
                  text: input.question || 'Please describe this image in detail.',
                },
              ],
            },
          ],
          max_tokens: 2048,
          stream: useStream,
        };

        const endpoint = vlmBaseUrl.replace(/\/$/, '') + '/chat/completions';

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${vlmApiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          return {
            success: false,
            error: `API error ${response.status}: ${errorText || response.statusText}`,
          };
        }

        // Streaming mode: read SSE chunks and forward to renderer
        if (useStream && response.body) {
          const win = BrowserWindow.getFocusedWindow();
          const decoder = new TextDecoder();
          const reader = response.body.getReader();
          let fullContent = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

              for (const line of lines) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(jsonStr);
                  const delta = parsed?.choices?.[0]?.delta?.content || '';
                  if (delta) {
                    fullContent += delta;
                    win?.webContents.send('system:analyzeImage:chunk', { delta, accumulated: fullContent });
                  }
                } catch {
                  // skip malformed SSE chunks
                }
              }
            }
          } catch (streamErr) {
            apiStats.totalResponseTimeMs += Date.now() - startTime;
            if (fullContent) {
              apiStats.successCount++;
              return { success: true, result: fullContent, streamed: true };
            }
            apiStats.failureCount++;
            throw streamErr;
          }

          apiStats.successCount++;
          apiStats.totalResponseTimeMs += Date.now() - startTime;
          return { success: true, result: fullContent || 'No response from model.', streamed: true };
        }

        // Non-streaming mode: standard JSON response
        const data = await response.json();
        const content =
          data?.choices?.[0]?.message?.content || 'No response from model.';

        apiStats.successCount++;
        apiStats.totalResponseTimeMs += Date.now() - startTime;
        return { success: true, result: content, streamed: false };
      } catch (error) {
        apiStats.failureCount++;
        apiStats.totalResponseTimeMs += Date.now() - startTime;
        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'Unknown error during analysis',
        };
      }
    }),

  /**
   * Analyze a document by extracting text and sending to LLM (text-only chat completion).
   * This is the mainstream approach used by Qwen, Kimi, ChatGPT etc.
   * Same API endpoint, but content is text-only (no image_url).
   * If text extraction fails or yields empty text, returns a hint for the caller
   * to fall back to VLM (e.g. scanned PDF → send as image).
   */
  'system:analyzeDocument': t.procedure
    .input<{
      fileBase64: string;
      fileName: string;
      question: string;
      stream?: boolean;
    }>()
    .handle(async ({ input }) => {
      const settings = SettingStore.getStore();
      const { vlmBaseUrl, vlmApiKey, vlmModelName } = settings;

      if (!vlmBaseUrl || !vlmApiKey) {
        return {
          success: false,
          error: 'VLM API not configured. Please set up VLM settings first.',
        };
      }

      const startTime = Date.now();
      apiStats.totalCalls++;
      apiStats.lastCallAt = new Date().toISOString();

      try {
        // Step 1: Extract text from the document buffer
        const rawBase64 = input.fileBase64.includes(',')
          ? input.fileBase64.split(',')[1]
          : input.fileBase64;
        const buffer = Buffer.from(rawBase64, 'base64');
        const extraction = extractDocumentTextFromBuffer(buffer, input.fileName);

        // If extraction yields no text, signal caller to try VLM fallback
        if (extraction.isEmpty) {
          return {
            success: false,
            fallbackToVLM: true,
            error: `Text extraction returned empty for ${extraction.method} file. The document may be scanned/image-based. Trying VLM analysis...`,
          };
        }

        // Step 2: Truncate very long text to fit model context window
        const MAX_CHARS = 60000; // ~15k tokens
        let docText = extraction.text;
        let truncated = false;
        if (docText.length > MAX_CHARS) {
          docText = docText.slice(0, MAX_CHARS);
          truncated = true;
        }

        // Step 3: Build text-only chat completion request (LLM mode)
        const systemPrompt = [
          'You are a professional document analysis assistant.',
          `The user uploaded a ${extraction.method.toUpperCase()} document named "${input.fileName}".`,
          truncated ? `Note: The document was truncated to ${MAX_CHARS} characters due to length.` : '',
          'Below is the extracted text content of the document.',
          'Please analyze it according to the user\'s question.',
        ].filter(Boolean).join(' ');

        const useStream = input.stream === true;

        const body = {
          model: vlmModelName || 'default',
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: `Document content:\n\n${docText}\n\n---\n\nQuestion: ${input.question}`,
            },
          ],
          max_tokens: 4096,
          stream: useStream,
        };

        const endpoint = vlmBaseUrl.replace(/\/$/, '') + '/chat/completions';

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${vlmApiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          apiStats.failureCount++;
          apiStats.totalResponseTimeMs += Date.now() - startTime;
          return {
            success: false,
            error: `API error ${response.status}: ${errorText || response.statusText}`,
          };
        }

        // Streaming mode
        if (useStream && response.body) {
          const win = BrowserWindow.getFocusedWindow();
          const decoder = new TextDecoder();
          const reader = response.body.getReader();
          let fullContent = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

              for (const line of lines) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(jsonStr);
                  const delta = parsed?.choices?.[0]?.delta?.content || '';
                  if (delta) {
                    fullContent += delta;
                    win?.webContents.send('system:analyzeDocument:chunk', { delta, accumulated: fullContent });
                  }
                } catch {
                  // skip malformed chunks
                }
              }
            }
          } catch (streamErr) {
            apiStats.totalResponseTimeMs += Date.now() - startTime;
            if (fullContent) {
              apiStats.successCount++;
              return { success: true, result: fullContent, method: extraction.method, streamed: true };
            }
            apiStats.failureCount++;
            throw streamErr;
          }

          apiStats.successCount++;
          apiStats.totalResponseTimeMs += Date.now() - startTime;
          return {
            success: true,
            result: fullContent || 'No response from model.',
            method: extraction.method,
            streamed: true,
          };
        }

        // Non-streaming mode
        const data = await response.json();
        const content =
          data?.choices?.[0]?.message?.content || 'No response from model.';

        apiStats.successCount++;
        apiStats.totalResponseTimeMs += Date.now() - startTime;
        return { success: true, result: content, method: extraction.method, streamed: false };
      } catch (error) {
        apiStats.failureCount++;
        apiStats.totalResponseTimeMs += Date.now() - startTime;
        return {
          success: false,
          error:
            error instanceof Error ? error.message : 'Unknown error during document analysis',
        };
      }
    }),

  /**
   * Export conversation to file (Markdown/HTML/JSON)
   */
  'system:exportConversation': t.procedure
    .input<{ messages: ExportMessage[]; options: ExportOptions }>()
    .handle(async ({ input }) => {
      try {
        const exporter = new ConversationExporter();
        const result = await exporter.exportConversation(input.messages, input.options);

        if (result.success && result.filePath) {
          // Open the export folder in file explorer
          const exportDir = exporter.getExportDir();
          await shell.openPath(exportDir);
        }

        return result;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Export failed',
        };
      }
    }),

  /**
   * Export single screenshot to file
   */
  'system:exportScreenshot': t.procedure
    .input<{ screenshotBase64: string; fileName?: string }>()
    .handle(async ({ input }) => {
      try {
        const exporter = new ConversationExporter();
        const result = await exporter.exportScreenshot(
          input.screenshotBase64,
          input.fileName,
        );

        if (result.success && result.filePath) {
          await shell.openPath(result.filePath);
        }

        return result;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Screenshot export failed',
        };
      }
    }),

  /**
   * Export code block to file
   */
  'system:exportCodeBlock': t.procedure
    .input<{ code: string; language: string; fileName?: string }>()
    .handle(async ({ input }) => {
      try {
        const exporter = new ConversationExporter();
        const result = await exporter.exportCodeBlock(
          input.code,
          input.language,
          input.fileName,
        );

        if (result.success && result.filePath) {
          await shell.openPath(result.filePath);
        }

        return result;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Code export failed',
        };
      }
    }),

  /**
   * Get export directory path and optionally open it in file explorer
   */
  'system:getExportDir': t.procedure
    .input<{ open?: boolean }>()
    .handle(async ({ input }) => {
      try {
        const exporter = new ConversationExporter();
        const exportPath = exporter.getExportDir();

        if (input?.open) {
          await shell.openPath(exportPath);
        }

        return {
          success: true,
          path: exportPath,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get export directory',
        };
      }
    }),

  /**
   * Multi-turn chat completion with VLM (text + optional images, streaming)
   */
  'system:chatCompletion': t.procedure
    .input<{
      messages: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
        imageBase64?: string;
        mimeType?: string;
      }>;
      stream?: boolean;
    }>()
    .handle(async ({ input }) => {
      const settings = SettingStore.getStore();
      const { vlmBaseUrl, vlmApiKey, vlmModelName } = settings;

      if (!vlmBaseUrl || !vlmApiKey) {
        return {
          success: false,
          error: 'VLM API not configured. Please set up VLM settings first.',
        };
      }

      const startTime = Date.now();
      apiStats.totalCalls++;
      apiStats.lastCallAt = new Date().toISOString();

      const useStream = input.stream !== false;

      try {
        // Build OpenAI-compatible messages array
        const apiMessages = input.messages.map((msg) => {
          if (msg.imageBase64) {
            const mime = msg.mimeType || 'image/png';
            const dataUrl = msg.imageBase64.startsWith('data:')
              ? msg.imageBase64
              : `data:${mime};base64,${msg.imageBase64}`;
            return {
              role: msg.role,
              content: [
                { type: 'image_url' as const, image_url: { url: dataUrl } },
                { type: 'text' as const, text: msg.content || 'Please describe this image.' },
              ],
            };
          }
          return { role: msg.role, content: msg.content };
        });

        const body = {
          model: vlmModelName || 'default',
          messages: apiMessages,
          max_tokens: 4096,
          stream: useStream,
        };

        const endpoint = vlmBaseUrl.replace(/\/$/, '') + '/chat/completions';

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${vlmApiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          return {
            success: false,
            error: `API error ${response.status}: ${errorText || response.statusText}`,
          };
        }

        if (useStream && response.body) {
          const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
          const decoder = new TextDecoder();
          const reader = response.body.getReader();
          let fullContent = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

              for (const line of lines) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(jsonStr);
                  const delta = parsed?.choices?.[0]?.delta?.content || '';
                  if (delta) {
                    fullContent += delta;
                    win?.webContents.send('system:chatCompletion:chunk', {
                      delta,
                      accumulated: fullContent,
                    });
                  }
                } catch {
                  // skip malformed SSE chunks
                }
              }
            }
          } catch (streamErr) {
            apiStats.totalResponseTimeMs += Date.now() - startTime;
            if (fullContent) {
              apiStats.successCount++;
              return { success: true, result: fullContent, streamed: true };
            }
            apiStats.failureCount++;
            throw streamErr;
          }

          apiStats.successCount++;
          apiStats.totalResponseTimeMs += Date.now() - startTime;
          return { success: true, result: fullContent || 'No response from model.', streamed: true };
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content || 'No response from model.';

        apiStats.successCount++;
        apiStats.totalResponseTimeMs += Date.now() - startTime;
        return { success: true, result: content, streamed: false };
      } catch (error) {
        apiStats.failureCount++;
        apiStats.totalResponseTimeMs += Date.now() - startTime;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error during chat',
        };
      }
    }),

  /**
   * Export application logs
   */
  'system:exportLogs': t.procedure
    .input<void>()
    .handle(async () => {
      try {
        await exportLogs();
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to export logs',
        };
      }
    }),
});
