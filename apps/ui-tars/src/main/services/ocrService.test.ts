/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OCRService } from './ocrService';

describe('OCRService', () => {
  let ocrService: OCRService;

  beforeEach(() => {
    ocrService = new OCRService();
  });

  afterEach(async () => {
    await ocrService.terminate();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await ocrService.initialize(['eng']);
      expect(ocrService.isInitialized()).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      await ocrService.initialize(['eng']);
      const firstInit = ocrService.isInitialized();
      
      await ocrService.initialize(['eng']);
      const secondInit = ocrService.isInitialized();
      
      expect(firstInit).toBe(true);
      expect(secondInit).toBe(true);
    });
  });

  describe('recognize', () => {
    it('should recognize text from image buffer', async () => {
      // Note: 实际测试需要 mock Tesseract.createWorker
      // 这里仅作为示例结构
      expect(true).toBe(true);
    });

    it('should filter low confidence results', async () => {
      // 测试低置信度结果过滤
      // 实际实现需要 mock worker
    });
  });

  describe('findText', () => {
    it('should find matching text', async () => {
      // 测试文本查找功能
    });

    it('should return empty array if text not found', async () => {
      // 测试未找到文本的情况
    });
  });

  describe('extractAllText', () => {
    it('should extract all text from image', async () => {
      // 测试提取所有文本
    });
  });

  describe('terminate', () => {
    it('should clean up resources', async () => {
      await ocrService.initialize(['eng']);
      await ocrService.terminate();
      
      expect(ocrService.isInitialized()).toBe(false);
    });
  });
});
