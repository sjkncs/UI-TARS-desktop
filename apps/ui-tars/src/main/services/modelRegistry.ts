/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 多模型注册表
 * 管理多个 VLM 模型提供商，支持动态切换和故障转移
 */

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

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  priority: number; // 优先级，数字越小优先级越高
  enabled: boolean;
  capabilities: {
    vision: boolean;
    reasoning: boolean;
    speed: 'fast' | 'medium' | 'slow';
    accuracy: 'high' | 'medium' | 'low';
  };
  limits?: {
    maxTokens?: number;
    rateLimit?: number; // 每分钟请求数
    timeout?: number; // 超时时间（毫秒）
  };
  metadata?: Record<string, any>;
}

export interface ModelPerformance {
  modelId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  lastUsed: number;
  errorRate: number;
}

export class ModelRegistry {
  private models: Map<string, ModelConfig> = new Map();
  private performance: Map<string, ModelPerformance> = new Map();
  private currentModelId: string | null = null;

  constructor() {
    logger.info('[ModelRegistry] Initialized');
  }

  /**
   * 注册模型
   */
  registerModel(config: ModelConfig): void {
    if (this.models.has(config.id)) {
      logger.warn(`[ModelRegistry] Model ${config.id} already registered, updating...`);
    }

    this.models.set(config.id, config);
    
    // 初始化性能数据
    if (!this.performance.has(config.id)) {
      this.performance.set(config.id, {
        modelId: config.id,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
        lastUsed: 0,
        errorRate: 0,
      });
    }

    logger.info(`[ModelRegistry] Registered model: ${config.name} (${config.id})`);
  }

  /**
   * 批量注册模型
   */
  registerModels(configs: ModelConfig[]): void {
    configs.forEach(config => this.registerModel(config));
  }

  /**
   * 注销模型
   */
  unregisterModel(modelId: string): boolean {
    if (!this.models.has(modelId)) {
      logger.warn(`[ModelRegistry] Model ${modelId} not found`);
      return false;
    }

    this.models.delete(modelId);
    this.performance.delete(modelId);
    
    if (this.currentModelId === modelId) {
      this.currentModelId = null;
    }

    logger.info(`[ModelRegistry] Unregistered model: ${modelId}`);
    return true;
  }

  /**
   * 获取模型配置
   */
  getModel(modelId: string): ModelConfig | undefined {
    return this.models.get(modelId);
  }

  /**
   * 获取所有模型
   */
  getAllModels(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  /**
   * 获取启用的模型
   */
  getEnabledModels(): ModelConfig[] {
    return Array.from(this.models.values()).filter(m => m.enabled);
  }

  /**
   * 按优先级排序的模型列表
   */
  getModelsByPriority(): ModelConfig[] {
    return this.getEnabledModels().sort((a, b) => a.priority - b.priority);
  }

  /**
   * 设置当前使用的模型
   */
  setCurrentModel(modelId: string): boolean {
    const model = this.models.get(modelId);
    if (!model) {
      logger.error(`[ModelRegistry] Model ${modelId} not found`);
      return false;
    }

    if (!model.enabled) {
      logger.error(`[ModelRegistry] Model ${modelId} is disabled`);
      return false;
    }

    this.currentModelId = modelId;
    logger.info(`[ModelRegistry] Current model set to: ${model.name} (${modelId})`);
    return true;
  }

  /**
   * 获取当前模型
   */
  getCurrentModel(): ModelConfig | null {
    if (!this.currentModelId) {
      return null;
    }
    return this.models.get(this.currentModelId) || null;
  }

  /**
   * 启用/禁用模型
   */
  setModelEnabled(modelId: string, enabled: boolean): boolean {
    const model = this.models.get(modelId);
    if (!model) {
      logger.error(`[ModelRegistry] Model ${modelId} not found`);
      return false;
    }

    model.enabled = enabled;
    logger.info(`[ModelRegistry] Model ${modelId} ${enabled ? 'enabled' : 'disabled'}`);

    // 如果禁用的是当前模型，清除当前模型
    if (!enabled && this.currentModelId === modelId) {
      this.currentModelId = null;
    }

    return true;
  }

  /**
   * 更新模型性能数据
   */
  updatePerformance(
    modelId: string,
    success: boolean,
    latency: number
  ): void {
    const perf = this.performance.get(modelId);
    if (!perf) {
      logger.warn(`[ModelRegistry] Performance data not found for ${modelId}`);
      return;
    }

    perf.totalRequests++;
    if (success) {
      perf.successfulRequests++;
    } else {
      perf.failedRequests++;
    }

    // 更新平均延迟（移动平均）
    perf.averageLatency = 
      (perf.averageLatency * (perf.totalRequests - 1) + latency) / perf.totalRequests;

    // 更新错误率
    perf.errorRate = perf.failedRequests / perf.totalRequests;

    // 更新最后使用时间
    perf.lastUsed = Date.now();

    logger.debug(
      `[ModelRegistry] Updated performance for ${modelId}: ` +
      `${perf.successfulRequests}/${perf.totalRequests} success, ` +
      `${perf.averageLatency.toFixed(0)}ms avg, ` +
      `${(perf.errorRate * 100).toFixed(1)}% error rate`
    );
  }

  /**
   * 获取模型性能数据
   */
  getPerformance(modelId: string): ModelPerformance | undefined {
    return this.performance.get(modelId);
  }

  /**
   * 获取所有性能数据
   */
  getAllPerformance(): Map<string, ModelPerformance> {
    return new Map(this.performance);
  }

  /**
   * 获取最佳模型（基于性能）
   */
  getBestModel(): ModelConfig | null {
    const enabledModels = this.getEnabledModels();
    if (enabledModels.length === 0) {
      return null;
    }

    // 评分算法：考虑成功率、延迟和优先级
    const scored = enabledModels.map(model => {
      const perf = this.performance.get(model.id);
      if (!perf || perf.totalRequests === 0) {
        // 新模型，使用优先级
        return { model, score: 1000 - model.priority };
      }

      // 成功率权重 60%，速度权重 30%，优先级权重 10%
      const successScore = (perf.successfulRequests / perf.totalRequests) * 60;
      const speedScore = Math.max(0, (5000 - perf.averageLatency) / 5000) * 30;
      const priorityScore = (10 - model.priority) * 1;

      return {
        model,
        score: successScore + speedScore + priorityScore,
      };
    });

    // 返回得分最高的模型
    scored.sort((a, b) => b.score - a.score);
    return scored[0].model;
  }

  /**
   * 获取健康的模型列表
   */
  getHealthyModels(errorThreshold = 0.3): ModelConfig[] {
    return this.getEnabledModels().filter(model => {
      const perf = this.performance.get(model.id);
      if (!perf || perf.totalRequests === 0) {
        return true; // 新模型视为健康
      }
      return perf.errorRate < errorThreshold;
    });
  }

  /**
   * 重置性能数据
   */
  resetPerformance(modelId?: string): void {
    if (modelId) {
      const perf = this.performance.get(modelId);
      if (perf) {
        perf.totalRequests = 0;
        perf.successfulRequests = 0;
        perf.failedRequests = 0;
        perf.averageLatency = 0;
        perf.errorRate = 0;
        logger.info(`[ModelRegistry] Reset performance for ${modelId}`);
      }
    } else {
      this.performance.forEach(perf => {
        perf.totalRequests = 0;
        perf.successfulRequests = 0;
        perf.failedRequests = 0;
        perf.averageLatency = 0;
        perf.errorRate = 0;
      });
      logger.info('[ModelRegistry] Reset all performance data');
    }
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    const lines: string[] = [
      '='.repeat(80),
      'Model Registry Performance Report',
      `Generated at: ${new Date().toISOString()}`,
      '='.repeat(80),
      '',
      `Total Models: ${this.models.size}`,
      `Enabled Models: ${this.getEnabledModels().length}`,
      `Current Model: ${this.currentModelId || 'None'}`,
      '',
      'Model Performance:',
      '',
    ];

    const sortedPerf = Array.from(this.performance.entries())
      .sort((a, b) => b[1].totalRequests - a[1].totalRequests);

    for (const [modelId, perf] of sortedPerf) {
      const model = this.models.get(modelId);
      if (!model) continue;

      lines.push(`${model.name} (${modelId}):`);
      lines.push(`  Status: ${model.enabled ? 'Enabled' : 'Disabled'}`);
      lines.push(`  Priority: ${model.priority}`);
      lines.push(`  Total Requests: ${perf.totalRequests}`);
      lines.push(`  Success Rate: ${((perf.successfulRequests / perf.totalRequests) * 100).toFixed(1)}%`);
      lines.push(`  Error Rate: ${(perf.errorRate * 100).toFixed(1)}%`);
      lines.push(`  Average Latency: ${perf.averageLatency.toFixed(0)}ms`);
      lines.push(`  Last Used: ${perf.lastUsed ? new Date(perf.lastUsed).toISOString() : 'Never'}`);
      lines.push('');
    }

    lines.push('='.repeat(80));
    return lines.join('\n');
  }

  /**
   * 清除所有数据
   */
  clear(): void {
    this.models.clear();
    this.performance.clear();
    this.currentModelId = null;
    logger.info('[ModelRegistry] Cleared all data');
  }
}

// 导出单例
export const modelRegistry = new ModelRegistry();
