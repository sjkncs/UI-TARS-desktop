/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 *
 * Zero-dependency document text extraction utilities.
 * Approach similar to mainstream agents (Qwen, Kimi, ChatGPT):
 *   - Images        → VLM (vision model)
 *   - Text files    → read as UTF-8 → LLM
 *   - DOCX          → unzip + parse XML → LLM
 *   - PDF           → basic binary text extraction → LLM
 *   - HTML          → strip tags → LLM
 */
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

// ─── Plain text formats ────────────────────────────────────────────

const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.markdown', '.csv', '.tsv', '.log',
  '.json', '.xml', '.yaml', '.yml', '.ini', '.cfg',
  '.js', '.ts', '.py', '.java', '.c', '.cpp', '.h', '.cs', '.go', '.rs',
  '.sh', '.bat', '.ps1', '.rb', '.php', '.swift', '.kt',
]);

export function isPlainTextFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

export async function extractPlainText(filePath: string): Promise<string> {
  return fs.promises.readFile(filePath, 'utf-8');
}

// ─── HTML ──────────────────────────────────────────────────────────

export function isHtmlFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.html' || ext === '.htm';
}

export async function extractHtmlText(filePath: string): Promise<string> {
  const html = await fs.promises.readFile(filePath, 'utf-8');
  return stripHtmlTags(html);
}

function stripHtmlTags(html: string): string {
  // Remove script/style blocks using indexOf loop (avoids ReDoS and bad-tag-filter bypass)
  let cleaned = html;
  for (const tag of ['script', 'style']) {
    let result = '';
    let searchFrom = 0;
    const openTag = '<' + tag;
    const closeTag = '</' + tag;
    while (searchFrom < cleaned.length) {
      const lower = cleaned.toLowerCase();
      const openIdx = lower.indexOf(openTag, searchFrom);
      if (openIdx === -1) {
        result += cleaned.slice(searchFrom);
        break;
      }
      result += cleaned.slice(searchFrom, openIdx);
      const closeIdx = lower.indexOf(closeTag, openIdx);
      if (closeIdx === -1) break;
      const closeEnd = cleaned.indexOf('>', closeIdx);
      searchFrom = closeEnd === -1 ? cleaned.length : closeEnd + 1;
    }
    cleaned = result;
  }

  // Strip remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities (single pass — no loop to avoid double-unescaping)
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');

  return cleaned.replace(/\s+/g, ' ').trim();
}

// ─── DOCX (Office Open XML) ───────────────────────────────────────
// DOCX is a ZIP file containing word/document.xml
// We use Node.js built-in zlib to decompress

export function isDocxFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.docx';
}

export async function extractDocxText(filePath: string): Promise<string> {
  const buf = await fs.promises.readFile(filePath);
  return extractDocxFromBuffer(buf);
}

export function extractDocxFromBuffer(buf: Buffer): string {
  try {
    // DOCX is a ZIP file; find word/document.xml entry
    const entries = parseZipEntries(buf);
    const docEntry = entries.find(
      (e) => e.name === 'word/document.xml',
    );
    if (!docEntry) {
      return '[Could not find document.xml in DOCX archive]';
    }
    const xml = docEntry.data.toString('utf-8');
    // Extract text from <w:t> tags
    const texts: string[] = [];
    const regex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(xml)) !== null) {
      texts.push(match[1]);
    }
    // Also detect paragraph breaks
    return texts.join('').replace(/<\/w:p>/g, '\n');
  } catch {
    return '[Failed to extract text from DOCX file]';
  }
}

// ─── PDF ───────────────────────────────────────────────────────────
// Basic PDF text extraction without external libraries.
// Works for most text-based PDFs. Scanned (image-only) PDFs will
// return minimal text — for those, we fall back to VLM.

export function isPdfFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.pdf';
}

export async function extractPdfText(filePath: string): Promise<string> {
  const buf = await fs.promises.readFile(filePath);
  return extractPdfFromBuffer(buf);
}

export function extractPdfFromBuffer(buf: Buffer): string {
  try {
    const raw = buf.toString('latin1');
    const texts: string[] = [];

    // Method 1: Extract text between BT..ET blocks with Tj/TJ operators
    const btBlocks = raw.match(/BT[\s\S]*?ET/g) || [];
    for (const block of btBlocks) {
      // Tj: single string
      const tjMatches = block.match(/\(([^)]*)\)\s*Tj/g) || [];
      for (const tj of tjMatches) {
        const m = tj.match(/\(([^)]*)\)/);
        if (m) texts.push(decodePdfString(m[1]));
      }
      // TJ: array of strings
      const tjArrayMatches = block.match(/\[([\s\S]*?)\]\s*TJ/g) || [];
      for (const tja of tjArrayMatches) {
        const parts = tja.match(/\(([^)]*)\)/g) || [];
        const line = parts
          .map((p) => {
            const m = p.match(/\(([^)]*)\)/);
            return m ? decodePdfString(m[1]) : '';
          })
          .join('');
        if (line.trim()) texts.push(line);
      }
    }

    // Method 2: Decompress FlateDecode streams and search for text
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let streamMatch: RegExpExecArray | null;
    while ((streamMatch = streamRegex.exec(raw)) !== null) {
      try {
        const compressed = Buffer.from(streamMatch[1], 'latin1');
        const decompressed = zlib.inflateSync(compressed).toString('latin1');
        // Look for BT..ET in decompressed content
        const innerBT = decompressed.match(/BT[\s\S]*?ET/g) || [];
        for (const block of innerBT) {
          const tjMatches = block.match(/\(([^)]*)\)\s*Tj/g) || [];
          for (const tj of tjMatches) {
            const m = tj.match(/\(([^)]*)\)/);
            if (m) texts.push(decodePdfString(m[1]));
          }
          const tjArrayMatches = block.match(/\[([\s\S]*?)\]\s*TJ/g) || [];
          for (const tja of tjArrayMatches) {
            const parts = tja.match(/\(([^)]*)\)/g) || [];
            const line = parts
              .map((p) => {
                const m2 = p.match(/\(([^)]*)\)/);
                return m2 ? decodePdfString(m2[1]) : '';
              })
              .join('');
            if (line.trim()) texts.push(line);
          }
        }
      } catch {
        // skip non-FlateDecode or corrupt streams
      }
    }

    const result = texts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    return result || '';
  } catch {
    return '';
  }
}

function decodePdfString(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
    .replace(/\\([()])/g, '$1');
}

// ─── Minimal ZIP parser (for DOCX) ────────────────────────────────
// Parses local file entries from a ZIP buffer using Node.js zlib

interface ZipEntry {
  name: string;
  data: Buffer;
}

function parseZipEntries(buf: Buffer): ZipEntry[] {
  const entries: ZipEntry[] = [];
  let offset = 0;

  while (offset < buf.length - 4) {
    // Local file header signature: 0x04034b50
    if (
      buf[offset] === 0x50 &&
      buf[offset + 1] === 0x4b &&
      buf[offset + 2] === 0x03 &&
      buf[offset + 3] === 0x04
    ) {
      const compressionMethod = buf.readUInt16LE(offset + 8);
      const compressedSize = buf.readUInt32LE(offset + 18);
      const uncompressedSize = buf.readUInt32LE(offset + 22);
      const fileNameLength = buf.readUInt16LE(offset + 26);
      const extraFieldLength = buf.readUInt16LE(offset + 28);
      const fileName = buf
        .subarray(offset + 30, offset + 30 + fileNameLength)
        .toString('utf-8');

      const dataStart = offset + 30 + fileNameLength + extraFieldLength;
      const rawData = buf.subarray(dataStart, dataStart + compressedSize);

      let fileData: Buffer;
      if (compressionMethod === 8) {
        // Deflate
        try {
          fileData = zlib.inflateRawSync(rawData);
        } catch {
          fileData = rawData;
        }
      } else {
        // Stored (no compression)
        fileData = rawData;
      }

      if (fileName && !fileName.endsWith('/')) {
        entries.push({ name: fileName, data: fileData });
      }

      offset = dataStart + compressedSize;
    } else {
      offset++;
    }
  }

  return entries;
}

// ─── Unified extraction interface ──────────────────────────────────

export interface ExtractionResult {
  text: string;
  method: 'plain' | 'html' | 'docx' | 'pdf' | 'unsupported';
  isEmpty: boolean;
}

/**
 * Extract text from a document file.
 * Returns extracted text and metadata about the extraction method.
 */
export async function extractDocumentText(
  filePath: string,
): Promise<ExtractionResult> {
  if (isPlainTextFile(filePath)) {
    const text = await extractPlainText(filePath);
    return { text, method: 'plain', isEmpty: !text.trim() };
  }
  if (isHtmlFile(filePath)) {
    const text = await extractHtmlText(filePath);
    return { text, method: 'html', isEmpty: !text.trim() };
  }
  if (isDocxFile(filePath)) {
    const text = await extractDocxText(filePath);
    return { text, method: 'docx', isEmpty: !text.trim() };
  }
  if (isPdfFile(filePath)) {
    const text = await extractPdfText(filePath);
    return { text, method: 'pdf', isEmpty: !text.trim() };
  }
  return { text: '', method: 'unsupported', isEmpty: true };
}

/**
 * Extract text from a buffer (used when file comes from renderer via IPC).
 */
export function extractDocumentTextFromBuffer(
  buffer: Buffer,
  fileName: string,
): ExtractionResult {
  const ext = path.extname(fileName).toLowerCase();

  if (TEXT_EXTENSIONS.has(ext)) {
    const text = buffer.toString('utf-8');
    return { text, method: 'plain', isEmpty: !text.trim() };
  }
  if (ext === '.html' || ext === '.htm') {
    const text = stripHtmlTags(buffer.toString('utf-8'));
    return { text, method: 'html', isEmpty: !text.trim() };
  }
  if (ext === '.docx') {
    const text = extractDocxFromBuffer(buffer);
    return { text, method: 'docx', isEmpty: !text.trim() };
  }
  if (ext === '.pdf') {
    const text = extractPdfFromBuffer(buffer);
    return { text, method: 'pdf', isEmpty: !text.trim() };
  }
  return { text: '', method: 'unsupported', isEmpty: true };
}
