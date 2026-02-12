/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 智能重试管理器
 * 提供自动重试、失败分析、策略调整等功能
 */
import { ExecuteOutput } from '@ui-tars/sdk/core';

// 使用条件导入避免测试环境问题
let logger: any;
try {
  logger = require('@main/logger').logger;
} catch {
  // 测试环境使用简单的 console logger
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface RetryContext {
  attempt: number;
  lastError?: Error;
  lastResult?: ExecuteOutput;
  adjustments: string[];
}

export class SmartRetryManager {
  private config: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  };

  /**
   * 执行带重试的操作
   */
  async executeWithRetry<T>(
    fn: (context: RetryContext) => Promise<T>,
    validator: (result: T) => boolean,
    options?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.config, ...options };
    const context: RetryContext = {
      attempt: 0,
      adjustments: [],
    };

    for (let i = 0; i < config.maxRetries; i++) {
      context.attempt = i + 1;

      try {
        logger.info(`[Retry] Attempt ${context.attempt}/${config.maxRetries}`);

        const result = await fn(context);

        // 验证结果
        if (validator(result)) {
          logger.info(`[Retry] Success on attempt ${context.attempt}`);
          return result;
        }

        // 结果不符合预期，分析原因
        context.lastResult = result as any;
        const reason = await this.analyzeFailure(result, context);
        logger.warn(`[Retry] Attempt ${context.attempt} failed: ${reason}`);

        // 最后一次尝试失败
        if (i === config.maxRetries - 1) {
          throw new Error(
            `Failed after ${config.maxRetries} attempts: ${reason}`
          );
        }

        // 调整策略
        await this.adjustStrategy(context, reason);

        // 等待后重试
        await this.sleep(this.calculateDelay(i, config));
      } catch (error) {
        context.lastError = error as Error;
        logger.error(`[Retry] Attempt ${context.attempt} error:`, error);

        if (i === config.maxRetries - 1) {
          throw error;
        }

        await this.sleep(this.calculateDelay(i, config));
      }
    }

    throw new Error('Retry logic error');
  }

  /**
   * 分析失败原因
   */
  private async analyzeFailure(
    result: any,
    _context: RetryContext,
  ): Promise<string> {
    // 检查常见失败模式
    if (!result) {
      return 'No result returned';
    }

    if (result.error) {
      return `Error: ${result.error}`;
    }

    if (result.status === 'timeout') {
      return 'Operation timeout';
    }

    if (result.status === 'element_not_found') {
      return 'Target element not found';
    }

    if (result.confidence && result.confidence < 0.5) {
      return `Low confidence: ${result.confidence}`;
    }

    return 'Unknown failure';
  }

  /**
   * 调整重试策略
   */
  private async adjustStrategy(
    context: RetryContext,
    reason: string
  ): Promise<void> {
    const adjustments: string[] = [];

    // 根据失败原因调整策略
    if (reason.includes('timeout')) {
      adjustments.push('increase_timeout');
    }

    if (reason.includes('not found')) {
      adjustments.push('wait_longer');
      adjustments.push('scroll_to_element');
    }

    if (reason.includes('Low confidence')) {
      adjustments.push('take_new_screenshot');
      adjustments.push('adjust_coordinates');
    }

    // 更新上下文的调整策略
    context.adjustments = adjustments;
    logger.info(`[Retry] Adjustments for next attempt:`, adjustments);
  }

  /**
   * 计算延迟时间（指数退避）
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const delay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
      config.maxDelay
    );
    return delay;
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// 导出单例
export const retryManager = new SmartRetryManager();
