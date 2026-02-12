/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * OCR 文字识别服务
 * 使用 Tesseract.js 进行文字识别，支持多语言
 */
import sharp from 'sharp';

// 使用条件导入避免测试环境问题
let logger: any;
let Tesseract: any;
try {
  logger = require('@main/logger').logger;
  Tesseract = require('tesseract.js').default || require('tesseract.js');
} catch {
  // 测试环境使用简单的 console logger
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };
  // Tesseract 会在实际使用时导入
}

export interface OCRResult {
  text: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface OCROptions {
  language?: string;
  psm?: number; // Page Segmentation Mode
  oem?: number; // OCR Engine Mode
}

export class OCRService {
  private worker: any = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * 初始化 OCR 引擎
   */
  async initialize(languages = ['eng', 'chi_sim']): Promise<void> {
    if (this.initialized) return;
    
    // 如果正在初始化，等待完成
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        logger.info('[OCR] Initializing Tesseract...', { languages });

        this.worker = await Tesseract.createWorker(languages, 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              logger.debug(`[OCR] Progress: ${(m.progress * 100).toFixed(1)}%`);
            }
          },
        });

        this.initialized = true;
        logger.info('[OCR] Tesseract initialized successfully');
      } catch (error) {
        logger.error('[OCR] Failed to initialize:', error);
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * 识别图片中的文字
   */
  async recognize(
    imageData: Buffer | string,
    _options: OCROptions = {}
  ): Promise<OCRResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('[OCR] Worker not initialized');
    }

    try {
      const startTime = Date.now();

      // 预处理图片（提高识别率）
      const processedImage = await this.preprocessImage(imageData);

      // 执行 OCR
      const result = await this.worker.recognize(processedImage);

      const duration = Date.now() - startTime;
      logger.info(`[OCR] Recognition completed in ${duration}ms`, {
        wordsFound: result.data.words.length,
        confidence: result.data.confidence,
      });

      // 解析结果
      const ocrResults: OCRResult[] = result.data.words.map((word) => ({
        text: word.text,
        confidence: word.confidence / 100,
        bbox: {
          x: word.bbox.x0,
          y: word.bbox.y0,
          width: word.bbox.x1 - word.bbox.x0,
          height: word.bbox.y1 - word.bbox.y0,
        },
      }));

      // 过滤低置信度结果
      const filtered = ocrResults.filter((r) => r.confidence > 0.6);
      logger.info(`[OCR] Filtered results: ${filtered.length}/${ocrResults.length}`);

      return filtered;
    } catch (error) {
      logger.error('[OCR] Recognition failed:', error);
      return [];
    }
  }

  /**
   * 预处理图片以提高识别率
   */
  private async preprocessImage(imageData: Buffer | string): Promise<Buffer> {
    try {
      const buffer =
        typeof imageData === 'string'
          ? Buffer.from(imageData, 'base64')
          : imageData;

      // 图片增强：灰度化、二值化、去噪
      const processed = await sharp(buffer)
        .greyscale()
        .normalize()
        .sharpen()
        .toBuffer();

      logger.debug('[OCR] Image preprocessed successfully');
      return processed;
    } catch (error) {
      logger.error('[OCR] Image preprocessing failed:', error);
      return typeof imageData === 'string'
        ? Buffer.from(imageData, 'base64')
        : imageData;
    }
  }

  /**
   * 在指定区域识别文字
   */
  async recognizeRegion(
    imageData: Buffer | string,
    region: { x: number; y: number; width: number; height: number }
  ): Promise<string> {
    try {
      const buffer =
        typeof imageData === 'string'
          ? Buffer.from(imageData, 'base64')
          : imageData;

      // 裁剪指定区域
      const cropped = await sharp(buffer)
        .extract({
          left: Math.max(0, Math.round(region.x)),
          top: Math.max(0, Math.round(region.y)),
          width: Math.round(region.width),
          height: Math.round(region.height),
        })
        .toBuffer();

      // 识别裁剪区域
      const results = await this.recognize(cropped);
      const text = results.map((r) => r.text).join(' ');

      logger.info(`[OCR] Region text: "${text}"`);
      return text;
    } catch (error) {
      logger.error('[OCR] Region recognition failed:', error);
      return '';
    }
  }

  /**
   * 查找包含指定文本的区域
   */
  async findText(
    imageData: Buffer | string,
    searchText: string
  ): Promise<OCRResult[]> {
    const results = await this.recognize(imageData);
    const matches = results.filter((r) =>
      r.text.toLowerCase().includes(searchText.toLowerCase())
    );

    logger.info(`[OCR] Found ${matches.length} matches for "${searchText}"`);
    return matches;
  }

  /**
   * 获取图片中的所有文本
   */
  async extractAllText(imageData: Buffer | string): Promise<string> {
    const results = await this.recognize(imageData);
    const text = results.map((r) => r.text).join(' ');
    return text;
  }

  /**
   * 清理资源
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.initialized = false;
      this.initPromise = null;
      logger.info('[OCR] Tesseract terminated');
    }
  }

  /**
   * 获取初始化状态
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// 导出单例
export const ocrService = new OCRService();
