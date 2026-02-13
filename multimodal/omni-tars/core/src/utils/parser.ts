/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatCompletionMessageToolCall } from '@tarko/agent-interface';

interface ParsedContent {
  answer: string;
  think: string;
  tools: ChatCompletionMessageToolCall[];
}

/** ReDoS-safe: extract content of an XML-like tag (case-insensitive option, supports attributes) */
function safeTagContent(text: string, tagName: string, ci = false): string | null {
  const src = ci ? text.toLowerCase() : text;
  const openStart = src.indexOf(ci ? '<' + tagName.toLowerCase() : '<' + tagName);
  if (openStart === -1) return null;
  const openEnd = src.indexOf('>', openStart);
  if (openEnd === -1) return null;
  const from = openEnd + 1;
  const closeTag = ci ? '</' + tagName.toLowerCase() : '</' + tagName;
  const closeStart = src.indexOf(closeTag, from);
  if (closeStart === -1) return null;
  return text.slice(from, closeStart);
}

/** ReDoS-safe: extract content between two markers */
function safeBetween(text: string, startMarker: string, endMarker: string): string | null {
  const s = text.indexOf(startMarker);
  if (s === -1) return null;
  const from = s + startMarker.length;
  const e = text.indexOf(endMarker, from);
  if (e === -1) return null;
  return text.slice(from, e);
}

/** ReDoS-safe: remove all occurrences of a tag and its content */
function safeRemoveTag(text: string, tagName: string): string {
  let result = text;
  const lowerResult = () => result.toLowerCase();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const lr = lowerResult();
    const openStart = lr.indexOf('<' + tagName.toLowerCase());
    if (openStart === -1) break;
    const closeTag = '</' + tagName.toLowerCase();
    const closeStart = lr.indexOf(closeTag, openStart);
    if (closeStart === -1) break;
    const closeEnd = lr.indexOf('>', closeStart);
    if (closeEnd === -1) break;
    result = result.slice(0, openStart) + result.slice(closeEnd + 1);
  }
  return result;
}

/**
 * Generate a unique tool call ID
 */
function generateToolCallId(): string {
  return `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Extract think content from various think tags (think, think_*, or custom think tags)
 */
function extractThinkContent(content: string): string {
  const body = safeTagContent(content, 'think');
  return body !== null ? body.trim() : '';
}

/**
 * Extract answer content from answer tag or content outside think tags
 */
function extractAnswerContent(content: string): string | null {
  // First try to extract from <answer> tag
  const body = safeTagContent(content, 'answer');
  if (body !== null) {
    return body.trim();
  }

  return null;
}

function isUndefined(str: string | null | undefined) {
  return typeof str === 'undefined' || str === null;
}

function finalizeAnswer(parsed: {
  answer: string | null;
  think: string;
  tools?: ChatCompletionMessageToolCall[];
  content: string;
}) {
  const { answer, tools = [], think, content } = parsed;

  // If no answer tag is found, but there is content and no tool calls, use the entire content as the answer
  if (isUndefined(answer) && !tools.length && content.trim()) {
    // The remaining content after removing the think part is used as the answer
    let contentWithoutThink = content;

    if (think) {
      contentWithoutThink = safeRemoveTag(content, 'think').trim();
    }

    if (contentWithoutThink) {
      return contentWithoutThink;
    }
  }

  if (tools.length > 0) {
    // If a tool call is detected but there is no explicit answer, the answer should be empty
    return '';
  }

  return answer;
}

/**
 * Parse code environment content and extract tool calls
 */
export function parseCodeContent(c: string): ParsedContent {
  const content = enhanceContent(c);
  const think = extractThinkContent(content);
  let answer = extractAnswerContent(content);

  const tools: ChatCompletionMessageToolCall[] = [];

  // Extract code_env function calls
  const codeEnvBody = safeTagContent(content, 'code_env');
  if (codeEnvBody !== null) {
    const codeEnvContent = codeEnvBody;

    // Extract function name
    const functionStart = codeEnvContent.indexOf('<function=');
    if (functionStart !== -1) {
      const functionEnd = codeEnvContent.indexOf('>', functionStart);
      if (functionEnd !== -1) {
        const functionName = codeEnvContent.slice(functionStart + '<function='.length, functionEnd);

        // Extract parameters
        const parameters: Record<string, string> = {};
        let paramSearch = 0;
        while (paramSearch < codeEnvContent.length) {
          const pOpen = codeEnvContent.indexOf('<parameter=', paramSearch);
          if (pOpen === -1) break;
          const pNameEnd = codeEnvContent.indexOf('>', pOpen);
          if (pNameEnd === -1) break;
          const pName = codeEnvContent.slice(pOpen + '<parameter='.length, pNameEnd);
          const pCloseTag = '</parameter>';
          const pClose = codeEnvContent.indexOf(pCloseTag, pNameEnd + 1);
          if (pClose === -1) break;
          const pValue = codeEnvContent.slice(pNameEnd + 1, pClose);
          parameters[pName] = pValue.trim();
          paramSearch = pClose + pCloseTag.length;
        }

        tools.push({
          id: generateToolCallId(),
          type: 'function' as const,
          function: {
            name: functionName,
            arguments: JSON.stringify(parameters),
          },
        });
      }
    }
  }

  answer = finalizeAnswer({ answer, tools, think, content });

  return {
    think,
    answer: answer || '',
    tools,
  };
}

/**
 * Parse MCP environment content and extract tool calls
 */
export function parseMcpContent(c: string): ParsedContent {
  const content = enhanceContent(c);
  const think = extractThinkContent(content);
  let answer = extractAnswerContent(content);

  const tools: ChatCompletionMessageToolCall[] = [];

  // Extract mcp_env function calls
  const mcpEnvBody = safeTagContent(content, 'mcp_env');
  if (mcpEnvBody !== null) {
    const mcpEnvContent = mcpEnvBody;

    // Extract function calls between FunctionCallBegin and FunctionCallEnd (ReDoS-safe)
    const fcBody = safeBetween(mcpEnvContent, '<|FunctionCallBegin|>', '<|FunctionCallEnd|>');
    const functionCallMatch = fcBody !== null ? fcBody.trim().match(/^(\[.*\])$/s) : null;
    if (functionCallMatch) {
      try {
        const functionCallData = JSON.parse(functionCallMatch[1]) as Array<{
          name: string;
          parameters: Record<string, unknown>;
        }>;

        for (const call of functionCallData) {
          if (call.name && call.parameters) {
            tools.push({
              id: generateToolCallId(),
              type: 'function' as const,
              function: {
                name: call.name,
                arguments: JSON.stringify(call.parameters),
              },
            });
          }
        }
      } catch (error) {
        console.error('Failed to parse MCP function call data:', error);
      }
    }
  }
  answer = finalizeAnswer({ answer, tools, think, content });

  return {
    think,
    answer: answer || '',
    tools,
  };
}

/**
 * Parse computer environment content and extract tool calls
 */
export function parseComputerContent(content: string): ParsedContent {
  const think = extractThinkContent(content);
  let answer = extractAnswerContent(content);

  const tools: ChatCompletionMessageToolCall[] = [];

  // Extract computer_env actions
  const computerEnvBody = safeTagContent(content, 'computer_env');
  if (computerEnvBody !== null) {
    const computerEnvContent = computerEnvBody.trim();

    // Parse action format: Action: click(point='<point>100 200</point>')
    const actionMatch = computerEnvContent.match(/Action:\s*(\w+)\(([^)]*)\)/);
    if (actionMatch) {
      const actionName = actionMatch[1];
      const actionParams = actionMatch[2];

      // Parse parameters
      const parameters: Record<string, string | { x: number; y: number }> = {};

      // Handle point parameter specially
      const pointMatch = actionParams.match(/point='<point>([^<]+)<\/point>'/);
      if (pointMatch) {
        const [x, y] = pointMatch[1].split(' ').map(Number);
        parameters.point = { x, y };
      }

      // Handle other parameters
      const otherParams = actionParams.replace(/point='<point>[^<]+<\/point>'/, '').split(',');
      for (const param of otherParams) {
        const trimmed = param.trim();
        if (trimmed) {
          const [key, value] = trimmed.split('=').map((s) => s.trim());
          if (key && value) {
            parameters[key] = value.replace(/^['"]|['"]$/g, ''); // Remove quotes
          }
        }
      }

      tools.push({
        id: generateToolCallId(),
        type: 'function' as const,
        function: {
          name: actionName,
          arguments: JSON.stringify(parameters),
        },
      });
    }
  }

  answer = finalizeAnswer({ answer, tools, think, content });

  return {
    think,
    answer: answer || '',
    tools,
  };
}

/**
 * Complete environment tags in content
 *
 * This function ensures that environment tags are properly closed by adding
 * missing closing tags for mcp_env and code_env elements.
 *
 * @param c - The content string to process
 * @returns The content with properly closed environment tags
 */
function enhanceContent(c: string): string {
  if (c.includes('<mcp_env>') && !c.includes('</mcp_env>')) {
    return c + '\n</mcp_env>';
  }
  if (c.includes('<code_env>') && !c.includes('</code_env>')) {
    return c + '\n</code_env>';
  }
  return c;
}
