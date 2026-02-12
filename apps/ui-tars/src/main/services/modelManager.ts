/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 模型管理器
 * 统一管理模型注册、选择、故障转移和性能追踪
 */

import { modelRegistry, ModelConfig, ModelPerformance } from './modelRegistry';
import { modelSelector, TaskRequirements } from './modelSelector';
import { performanceMonitor } from './performanceMonitor';

// 使用条件导入避免测试环境问题
let logger: any;
try {
  logger = require('@main/logger').logger;
} catch {
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };
}

export interface ModelExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  modelId: string;
  latency: number;
  retries: number;
}

export class ModelManager {
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor() {
    logger.info('[ModelManager] Initialized');
  }

  /**
   * 使用最佳模型执行任务
   */
  async executeWithBestModel<T>(
    task: () => Promise<T>,
    requirements?: TaskRequirements
  ): Promise<ModelExecutionResult<T>> {
    return await performanceMonitor.measure('model.execute', async () => {
      let retries = 0;
      let lastError: Error | undefined;

      while (retries < this.maxRetries) {
        try {
          // 选择模型
          const selection = await modelSelector.selectModel(requirements);
          const model = selection.model;

          logger.info(
            `[ModelManager] Executing with model: ${model.name} ` +
            `(attempt ${retries + 1}/${this.maxRetries})`
          );

          // 执行任务并测量性能
          const startTime = performance.now();
          const data = await this.executeWithTimeout(
            task,
            model.limits?.timeout || 30000
          );
          const latency = performance.now() - startTime;

          // 更新性能数据
          modelRegistry.updatePerformance(model.id, true, latency);

          logger.info(
            `[ModelManager] Success with ${model.name} ` +
            `(${latency.toFixed(0)}ms)`
          );

          return {
            success: true,
            data,
            modelId: model.id,
            latency,
            retries,
          };
        } catch (error) {
          lastError = error as Error;
          retries++;

          // 获取当前选择的模型ID
          const currentSelection = await modelSelector.selectModel(requirements);
          const currentModelId = currentSelection.model.id;

          // 更新性能数据（失败）
          modelRegistry.updatePerformance(currentModelId, false, 0);

          logger.warn(
            `[ModelManager] Attempt ${retries} failed: ${lastError.message}`
          );

          if (retries < this.maxRetries) {
            // 尝试故障转移
            const failoverModel = await modelSelector.getFailoverModel(
              currentModelId,
              requirements || {
                requiresVision: true,
                requiresReasoning: true,
                priority: 'balanced',
              }
            );

            if (!failoverModel) {
              logger.error('[ModelManager] No failover model available');
              break;
            }

            // 等待后重试
            await this.sleep(this.retryDelay * retries);
          }
        }
      }

      // 所有重试都失败
      logger.error(
        `[ModelManager] All attempts failed after ${retries} retries`
      );

      return {
        success: false,
        error: lastError,
        modelId: 'unknown',
        latency: 0,
        retries,
      };
    });
  }

  /**
   * 带超时的执行
   */
  private async executeWithTimeout<T>(
    task: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      task(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Task timeout')), timeout)
      ),
    ]);
  }

  /**
   * 休眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 注册模型
   */
  registerModel(config: ModelConfig): void {
    modelRegistry.registerModel(config);
  }

  /**
   * 批量注册模型
   */
  registerModels(configs: ModelConfig[]): void {
    modelRegistry.registerModels(configs);
  }

  /**
   * 获取所有模型
   */
  getAllModels(): ModelConfig[] {
    return modelRegistry.getAllModels();
  }

  /**
   * 获取模型性能
   */
  getModelPerformance(modelId: string): ModelPerformance | undefined {
    return modelRegistry.getPerformance(modelId);
  }

  /**
   * 获取所有性能数据
   */
  getAllPerformance(): Map<string, ModelPerformance> {
    return modelRegistry.getAllPerformance();
  }

  /**
   * 获取最佳模型
   */
  getBestModel(): ModelConfig | null {
    return modelRegistry.getBestModel();
  }

  /**
   * 启用/禁用模型
   */
  setModelEnabled(modelId: string, enabled: boolean): boolean {
    return modelRegistry.setModelEnabled(modelId, enabled);
  }

  /**
   * 重置性能数据
   */
  resetPerformance(modelId?: string): void {
    modelRegistry.resetPerformance(modelId);
    if (!modelId) {
      modelSelector.resetFailedModels();
    }
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    const registryReport = modelRegistry.generateReport();
    const selectorStats = modelSelector.getStats();

    const lines: string[] = [
      registryReport,
      '',
      'Model Selector Statistics:',
      `  Cache Size: ${selectorStats.cacheSize}`,
      `  Failed Models: ${selectorStats.failedModels}`,
      `  Last Selection: ${selectorStats.lastSelection ? new Date(selectorStats.lastSelection).toISOString() : 'Never'}`,
      '',
    ];

    return lines.join('\n');
  }

  /**
   * 清除所有数据
   */
  clear(): void {
    modelRegistry.clear();
    modelSelector.clearCache();
    modelSelector.resetFailedModels();
    logger.info('[ModelManager] Cleared all data');
  }

  /**
   * 配置重试参数
   */
  configureRetry(maxRetries: number, retryDelay: number): void {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    logger.info(
      `[ModelManager] Retry configured: ${maxRetries} retries, ${retryDelay}ms delay`
    );
  }
}

// 导出单例
export const modelManager = new ModelManager();
