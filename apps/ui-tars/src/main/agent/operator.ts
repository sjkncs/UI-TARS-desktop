/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Key, keyboard } from '@computer-use/nut-js';
import {
  type ScreenshotOutput,
  type ExecuteParams,
  type ExecuteOutput,
} from '@ui-tars/sdk/core';
import { NutJSOperator } from '@ui-tars/operator-nut-js';
import { clipboard } from 'electron';
import { desktopCapturer } from 'electron';

import * as env from '@main/env';
import { logger } from '@main/logger';
import { sleep } from '@ui-tars/shared/utils';
import { getScreenSize } from '@main/utils/screen';
import { optimizationConfig } from '@main/services/optimizationConfig';
import { retryManager } from '@main/services/retryManager';
import { ocrService } from '@main/services/ocrService';

export class NutJSElectronOperator extends NutJSOperator {
  static MANUAL = {
    ACTION_SPACES: [
      `click(start_box='[x1, y1, x2, y2]')`,
      `left_double(start_box='[x1, y1, x2, y2]')`,
      `right_single(start_box='[x1, y1, x2, y2]')`,
      `drag(start_box='[x1, y1, x2, y2]', end_box='[x3, y3, x4, y4]')`,
      `hotkey(key='')`,
      `type(content='') #If you want to submit your input, use "\\n" at the end of \`content\`.`,
      `scroll(start_box='[x1, y1, x2, y2]', direction='down or up or right or left')`,
      `wait() #Sleep for 5s and take a screenshot to check for any changes.`,
      `finished()`,
      `call_user() # Submit the task and call the user when the task is unsolvable, or when you need the user's help.`,
    ],
  };

  public async screenshot(): Promise<ScreenshotOutput> {
    const {
      physicalSize,
      logicalSize,
      scaleFactor,
      id: primaryDisplayId,
    } = getScreenSize(); // Logical = Physical / scaleX

    logger.info(
      '[screenshot] [primaryDisplay]',
      'logicalSize:',
      logicalSize,
      'scaleFactor:',
      scaleFactor,
    );

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.round(logicalSize.width),
        height: Math.round(logicalSize.height),
      },
    });
    const primarySource =
      sources.find(
        (source) => source.display_id === primaryDisplayId.toString(),
      ) || sources[0];

    if (!primarySource) {
      logger.error('[screenshot] Primary display source not found', {
        primaryDisplayId,
        availableSources: sources.map((s) => s.display_id),
      });
      // fallback to default screenshot
      return await super.screenshot();
    }

    const screenshot = primarySource.thumbnail;

    // Cap resolution at 1920px width to reduce base64 size for API
    const maxWidth = 1920;
    let targetWidth = physicalSize.width;
    let targetHeight = physicalSize.height;
    if (targetWidth > maxWidth) {
      const ratio = maxWidth / targetWidth;
      targetWidth = maxWidth;
      targetHeight = Math.round(targetHeight * ratio);
    }

    const resized = screenshot.resize({
      width: targetWidth,
      height: targetHeight,
    });

    const base64 = resized.toJPEG(50).toString('base64');

    if (optimizationConfig.isEnabled('enableOCR')) {
      this.performOCRAsync(base64).catch((error) => {
        logger.error('[screenshot] OCR failed:', error);
      });
    }

    return {
      base64,
      scaleFactor,
    };
  }

  /**
   * 异步执行 OCR 识别（仅在 enableOCR 开启时被调用）
   */
  private async performOCRAsync(base64: string): Promise<void> {
    try {
      if (!ocrService.isInitialized()) {
        await ocrService.initialize(['eng', 'chi_sim']);
      }

      const buffer = Buffer.from(base64, 'base64');
      const ocrResults = await ocrService.recognize(buffer);

      if (ocrResults.length > 0) {
        logger.info(`[OCR] Found ${ocrResults.length} text regions`);
        logger.debug(
          '[OCR] Sample texts:',
          ocrResults.slice(0, 5).map((r) => r.text),
        );
      }
    } catch (error) {
      logger.error('[OCR] Recognition error:', error);
    }
  }

  /**
   * 查找并点击包含指定文本的元素（需要 enableOCR）
   */
  async findTextAndClick(text: string): Promise<boolean> {
    if (!optimizationConfig.isEnabled('enableOCR')) {
      logger.warn('[OCR] findTextAndClick called but enableOCR is off');
      return false;
    }

    try {
      logger.info(`[OCR] Searching for text: "${text}"`);

      const screenshot = await this.screenshot();
      const buffer = Buffer.from(screenshot.base64, 'base64');

      const matches = await ocrService.findText(buffer, text);

      if (matches.length === 0) {
        logger.warn(`[OCR] Text not found: "${text}"`);
        return false;
      }

      const target = matches[0];
      const centerX = target.bbox.x + target.bbox.width / 2;
      const centerY = target.bbox.y + target.bbox.height / 2;

      logger.info(`[OCR] Clicking text at (${centerX}, ${centerY})`);

      await this.execute({
        parsedPrediction: {
          action_type: 'click',
          action_inputs: {
            start_box: [centerX, centerY, centerX, centerY],
          },
        },
      } as any);

      return true;
    } catch (error) {
      logger.error('[OCR] findTextAndClick failed:', error);
      return false;
    }
  }

  /**
   * Windows 剪贴板输入的内部实现
   */
  private async typeViaClipboard(content: string): Promise<void> {
    const stripContent = content.replace(/\\n$/, '').replace(/\n$/, '');
    const originalClipboard = clipboard.readText();
    clipboard.writeText(stripContent);
    await keyboard.pressKey(Key.LeftControl, Key.V);
    await sleep(50);
    await keyboard.releaseKey(Key.LeftControl, Key.V);
    await sleep(50);
    clipboard.writeText(originalClipboard);
  }

  async execute(params: ExecuteParams): Promise<ExecuteOutput> {
    const { action_type, action_inputs } = params.parsedPrediction;

    // --- 智能重试路径（仅在 enableRetry 开启时生效）---
    if (optimizationConfig.isEnabled('enableRetry')) {
      const criticalActions = [
        'click',
        'type',
        'drag',
        'left_double',
        'right_single',
      ];
      if (criticalActions.includes(action_type)) {
        return await retryManager.executeWithRetry(
          async (context) => {
            if (context.attempt > 1) {
              logger.info(
                `[Retry] Waiting for UI to stabilize (attempt ${context.attempt})`,
              );
              await sleep(1000);
              if (context.adjustments.includes('wait_longer')) {
                await sleep(1000);
              }
            }

            if (
              action_type === 'type' &&
              env.isWindows &&
              action_inputs?.content
            ) {
              const content = action_inputs.content?.trim();
              logger.info('[device] type', content);
              await this.typeViaClipboard(content);
            }
            return await super.execute(params);
          },
          () => true,
          { maxRetries: 2, baseDelay: 500 },
        );
      }
    }

    // --- 原有逻辑路径（默认）---
    if (action_type === 'type' && env.isWindows && action_inputs?.content) {
      const content = action_inputs.content?.trim();
      logger.info('[device] type', content);
      await this.typeViaClipboard(content);
    }
    return await super.execute(params);
  }
}
