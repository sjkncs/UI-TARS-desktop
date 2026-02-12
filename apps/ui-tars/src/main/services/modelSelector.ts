/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 智能模型选择器
 * 根据任务类型、性能数据和可用性自动选择最佳模型
 */

import { modelRegistry, ModelConfig } from './modelRegistry';
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

export interface TaskRequirements {
  requiresVision: boolean;
  requiresReasoning: boolean;
  preferSpeed?: boolean; // 优先速度还是准确率
  maxLatency?: number; // 最大可接受延迟（毫秒）
  priority?: 'speed' | 'accuracy' | 'balanced';
}

export interface SelectionResult {
  model: ModelConfig;
  reason: string;
  score: number;
  alternatives: ModelConfig[];
}

export class ModelSelector {
  private failedModels: Set<string> = new Set();
  private lastSelectionTime: number = 0;
  private selectionCache: Map<string, SelectionResult> = new Map();
  private cacheTTL: number = 60000; // 缓存有效期 1 分钟

  constructor() {
    logger.info('[ModelSelector] Initialized');
  }

  /**
   * 选择最佳模型
   */
  async selectModel(
    requirements: TaskRequirements = {
      requiresVision: true,
      requiresReasoning: true,
      priority: 'balanced',
    }
  ): Promise<SelectionResult> {
    return await performanceMonitor.measure('model.selection', async () => {
      // 检查缓存
      const cacheKey = this.getCacheKey(requirements);
      const cached = this.selectionCache.get(cacheKey);
      if (cached && Date.now() - this.lastSelectionTime < this.cacheTTL) {
        logger.debug('[ModelSelector] Using cached selection');
        return cached;
      }

      // 获取候选模型
      const candidates = this.getCandidates(requirements);

      if (candidates.length === 0) {
        throw new Error('No suitable models available');
      }

      // 评分并排序
      const scored = candidates.map(model => ({
        model,
        score: this.scoreModel(model, requirements),
      }));

      scored.sort((a, b) => b.score - a.score);

      const result: SelectionResult = {
        model: scored[0].model,
        reason: this.getSelectionReason(scored[0].model, requirements),
        score: scored[0].score,
        alternatives: scored.slice(1, 4).map(s => s.model),
      };

      // 更新缓存
      this.selectionCache.set(cacheKey, result);
      this.lastSelectionTime = Date.now();

      logger.info(
        `[ModelSelector] Selected model: ${result.model.name} ` +
        `(score: ${result.score.toFixed(2)}, reason: ${result.reason})`
      );

      return result;
    });
  }

  /**
   * 获取候选模型
   */
  private getCandidates(requirements: TaskRequirements): ModelConfig[] {
    // 获取所有启用的模型
    let candidates = modelRegistry.getEnabledModels();

    // 过滤失败的模型
    candidates = candidates.filter(m => !this.failedModels.has(m.id));

    // 过滤不满足能力要求的模型
    candidates = candidates.filter(model => {
      if (requirements.requiresVision && !model.capabilities.vision) {
        return false;
      }
      if (requirements.requiresReasoning && !model.capabilities.reasoning) {
        return false;
      }
      return true;
    });

    // 过滤延迟超标的模型
    if (requirements.maxLatency) {
      candidates = candidates.filter(model => {
        const perf = modelRegistry.getPerformance(model.id);
        if (!perf || perf.totalRequests === 0) {
          return true; // 新模型保留
        }
        return perf.averageLatency <= requirements.maxLatency!;
      });
    }

    return candidates;
  }

  /**
   * 模型评分
   */
  private scoreModel(
    model: ModelConfig,
    requirements: TaskRequirements
  ): number {
    let score = 0;

    // 基础分：优先级（反向，数字越小优先级越高）
    score += (10 - model.priority) * 10;

    // 性能数据
    const perf = modelRegistry.getPerformance(model.id);
    if (perf && perf.totalRequests > 0) {
      // 成功率权重
      const successRate = perf.successfulRequests / perf.totalRequests;
      score += successRate * 40;

      // 延迟权重（根据优先级调整）
      const latencyScore = Math.max(0, (5000 - perf.averageLatency) / 5000);
      if (requirements.priority === 'speed' || requirements.preferSpeed) {
        score += latencyScore * 30;
      } else if (requirements.priority === 'accuracy') {
        score += latencyScore * 10;
      } else {
        score += latencyScore * 20;
      }
    } else {
      // 新模型给予中等分数
      score += 25;
    }

    // 能力匹配度
    if (model.capabilities.accuracy === 'high') {
      score += requirements.priority === 'accuracy' ? 15 : 10;
    }
    if (model.capabilities.speed === 'fast') {
      score += requirements.priority === 'speed' ? 15 : 10;
    }

    return score;
  }

  /**
   * 生成选择原因
   */
  private getSelectionReason(
    model: ModelConfig,
    _requirements: TaskRequirements,
  ): string {
    const reasons: string[] = [];

    const perf = modelRegistry.getPerformance(model.id);
    if (perf && perf.totalRequests > 0) {
      const successRate = (perf.successfulRequests / perf.totalRequests) * 100;
      reasons.push(`${successRate.toFixed(0)}% success rate`);
      reasons.push(`${perf.averageLatency.toFixed(0)}ms avg latency`);
    }

    if (model.priority <= 2) {
      reasons.push('high priority');
    }

    if (model.capabilities.accuracy === 'high') {
      reasons.push('high accuracy');
    }

    if (model.capabilities.speed === 'fast') {
      reasons.push('fast speed');
    }

    return reasons.join(', ');
  }

  /**
   * 标记模型失败
   */
  markModelFailed(modelId: string): void {
    this.failedModels.add(modelId);
    logger.warn(`[ModelSelector] Marked model ${modelId} as failed`);

    // 清除缓存
    this.selectionCache.clear();
  }

  /**
   * 重置失败标记
   */
  resetFailedModels(modelId?: string): void {
    if (modelId) {
      this.failedModels.delete(modelId);
      logger.info(`[ModelSelector] Reset failed status for ${modelId}`);
    } else {
      this.failedModels.clear();
      logger.info('[ModelSelector] Reset all failed models');
    }

    // 清除缓存
    this.selectionCache.clear();
  }

  /**
   * 获取故障转移模型
   */
  async getFailoverModel(
    failedModelId: string,
    requirements: TaskRequirements
  ): Promise<ModelConfig | null> {
    // 标记失败的模型
    this.markModelFailed(failedModelId);

    // 尝试选择新模型
    try {
      const result = await this.selectModel(requirements);
      logger.info(
        `[ModelSelector] Failover from ${failedModelId} to ${result.model.id}`
      );
      return result.model;
    } catch (error) {
      logger.error('[ModelSelector] No failover model available:', error);
      return null;
    }
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(requirements: TaskRequirements): string {
    return JSON.stringify(requirements);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.selectionCache.clear();
    logger.debug('[ModelSelector] Cache cleared');
  }

  /**
   * 获取选择统计
   */
  getStats(): {
    cacheSize: number;
    failedModels: number;
    lastSelection: number;
  } {
    return {
      cacheSize: this.selectionCache.size,
      failedModels: this.failedModels.size,
      lastSelection: this.lastSelectionTime,
    };
  }
}

// 导出单例
export const modelSelector = new ModelSelector();
