/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface ExportMessage {
  role: 'user' | 'assistant';
  content: string;
  screenshotBase64?: string;
  timestamp?: number;
}

export interface ExportOptions {
  format: 'markdown' | 'html' | 'json';
  includeScreenshots: boolean;
  includeTimestamps: boolean;
}

/**
 * Conversation exporter - saves chat history with screenshots to local files
 */
export class ConversationExporter {
  private exportDir: string;

  constructor() {
    this.exportDir = path.join(app.getPath('userData'), 'exports');
    this.ensureExportDir();
  }

  private ensureExportDir(): void {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  /**
   * Export conversation to file
   */
  async exportConversation(
    messages: ExportMessage[],
    options: ExportOptions,
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const sessionDir = path.join(this.exportDir, `conversation_${timestamp}`);
      
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      let filePath: string;
      let content: string;

      switch (options.format) {
        case 'markdown':
          content = this.toMarkdown(messages, options, sessionDir);
          filePath = path.join(sessionDir, 'conversation.md');
          break;
        case 'html':
          content = this.toHTML(messages, options, sessionDir);
          filePath = path.join(sessionDir, 'conversation.html');
          break;
        case 'json':
          content = JSON.stringify(messages, null, 2);
          filePath = path.join(sessionDir, 'conversation.json');
          break;
        default:
          return { success: false, error: 'Unsupported format' };
      }

      fs.writeFileSync(filePath, content, 'utf-8');

      return { success: true, filePath };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  /**
   * Export single screenshot
   */
  async exportScreenshot(
    screenshotBase64: string,
    fileName?: string,
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      if (!screenshotBase64 || screenshotBase64.trim().length === 0) {
        return { success: false, error: 'No screenshot data provided' };
      }

      const screenshotsDir = path.join(this.exportDir, 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const name = fileName || `screenshot_${timestamp}.png`;
      const filePath = path.join(screenshotsDir, name);

      // Remove data:image/png;base64, prefix if present
      const base64Data = screenshotBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      fs.writeFileSync(filePath, buffer);

      return { success: true, filePath };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Screenshot export failed',
      };
    }
  }

  /**
   * Export code block to file
   */
  async exportCodeBlock(
    code: string,
    language: string,
    fileName?: string,
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const codeDir = path.join(this.exportDir, 'code');
      if (!fs.existsSync(codeDir)) {
        fs.mkdirSync(codeDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const ext = this.getFileExtension(language);
      const name = fileName || `code_${timestamp}${ext}`;
      const filePath = path.join(codeDir, name);

      fs.writeFileSync(filePath, code, 'utf-8');

      return { success: true, filePath };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Code export failed',
      };
    }
  }

  /**
   * Convert messages to Markdown format
   */
  private toMarkdown(
    messages: ExportMessage[],
    options: ExportOptions,
    sessionDir: string,
  ): string {
    let md = `# UI-TARS Conversation Export\n\n`;
    md += `**Exported at:** ${new Date().toLocaleString()}\n\n`;
    md += `---\n\n`;

    messages.forEach((msg, idx) => {
      const role = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
      md += `## ${role}\n\n`;

      if (options.includeTimestamps && msg.timestamp) {
        md += `*${new Date(msg.timestamp).toLocaleString()}*\n\n`;
      }

      if (options.includeScreenshots && msg.screenshotBase64) {
        const screenshotPath = this.saveScreenshotToSession(
          msg.screenshotBase64,
          sessionDir,
          `screenshot_${idx}.png`,
        );
        md += `![Screenshot](${path.basename(screenshotPath)})\n\n`;
      }

      md += `${msg.content}\n\n`;
      md += `---\n\n`;
    });

    return md;
  }

  /**
   * Convert messages to HTML format
   */
  private toHTML(
    messages: ExportMessage[],
    options: ExportOptions,
    sessionDir: string,
  ): string {
    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UI-TARS Conversation Export</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .message {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 15px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .user { border-left: 4px solid #3b82f6; }
    .assistant { border-left: 4px solid #10b981; }
    .role {
      font-weight: bold;
      margin-bottom: 10px;
      color: #374151;
    }
    .timestamp {
      font-size: 0.875rem;
      color: #6b7280;
      margin-bottom: 10px;
    }
    .content {
      line-height: 1.6;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .screenshot {
      max-width: 100%;
      border-radius: 4px;
      margin: 10px 0;
    }
    pre {
      background: #1f2937;
      color: #f3f4f6;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
    }
    code {
      font-family: 'Courier New', monospace;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🤖 UI-TARS Conversation Export</h1>
    <p><strong>Exported at:</strong> ${new Date().toLocaleString()}</p>
  </div>
`;

    messages.forEach((msg, idx) => {
      const roleClass = msg.role === 'user' ? 'user' : 'assistant';
      const roleIcon = msg.role === 'user' ? '👤' : '🤖';
      const roleName = msg.role === 'user' ? 'User' : 'Assistant';

      html += `  <div class="message ${roleClass}">
    <div class="role">${roleIcon} ${roleName}</div>
`;

      if (options.includeTimestamps && msg.timestamp) {
        html += `    <div class="timestamp">${new Date(msg.timestamp).toLocaleString()}</div>\n`;
      }

      if (options.includeScreenshots && msg.screenshotBase64) {
        const screenshotPath = this.saveScreenshotToSession(
          msg.screenshotBase64,
          sessionDir,
          `screenshot_${idx}.png`,
        );
        html += `    <img src="${path.basename(screenshotPath)}" class="screenshot" alt="Screenshot" />\n`;
      }

      const escapedContent = this.escapeHtml(msg.content);
      html += `    <div class="content">${escapedContent}</div>
  </div>
`;
    });

    html += `</body>
</html>`;

    return html;
  }

  /**
   * Save screenshot to session directory
   */
  private saveScreenshotToSession(
    screenshotBase64: string,
    sessionDir: string,
    fileName: string,
  ): string {
    const base64Data = screenshotBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const filePath = path.join(sessionDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  /**
   * Get file extension for language
   */
  private getFileExtension(language: string): string {
    const extMap: Record<string, string> = {
      javascript: '.js',
      typescript: '.ts',
      python: '.py',
      java: '.java',
      cpp: '.cpp',
      c: '.c',
      csharp: '.cs',
      go: '.go',
      rust: '.rs',
      html: '.html',
      css: '.css',
      json: '.json',
      xml: '.xml',
      yaml: '.yaml',
      sql: '.sql',
      bash: '.sh',
      shell: '.sh',
    };
    return extMap[language.toLowerCase()] || '.txt';
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Get export directory path
   */
  getExportDir(): string {
    return this.exportDir;
  }
}
