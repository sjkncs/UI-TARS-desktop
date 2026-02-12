/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 优化功能配置
 * 通过功能开关控制各优化模块的启用/禁用
 * 所有开关默认关闭，确保原有功能不受影响
 */

export interface OptimizationFlags {
  /** 智能重试机制 - 对关键操作自动重试 */
  enableRetry: boolean;
  /** OCR 文字识别 - 截图时异步识别文字 */
  enableOCR: boolean;
  /** 性能监控 - 追踪操作耗时和统计 */
  enablePerformanceMonitor: boolean;
  /** 多模型支持 - 智能模型选择和故障转移 */
  enableMultiModel: boolean;
  /** 工作流引擎 - 任务录制和回放 */
  enableWorkflow: boolean;
  /** 可视化 IPC 接口 - 为前端提供可视化数据 */
  enableVisualization: boolean;
}

/**
 * 默认配置：所有功能关闭
 * 使用者可按需开启
 */
const DEFAULT_FLAGS: OptimizationFlags = {
  enableRetry: false,
  enableOCR: false,
  enablePerformanceMonitor: false,
  enableMultiModel: false,
  enableWorkflow: false,
  enableVisualization: false,
};

class OptimizationConfig {
  private flags: OptimizationFlags;

  constructor() {
    this.flags = { ...DEFAULT_FLAGS };
  }

  /** 获取当前配置 */
  getFlags(): Readonly<OptimizationFlags> {
    return { ...this.flags };
  }

  /** 更新配置 */
  setFlags(partial: Partial<OptimizationFlags>): void {
    this.flags = { ...this.flags, ...partial };
  }

  /** 启用所有功能 */
  enableAll(): void {
    this.flags = {
      enableRetry: true,
      enableOCR: true,
      enablePerformanceMonitor: true,
      enableMultiModel: true,
      enableWorkflow: true,
      enableVisualization: true,
    };
  }

  /** 禁用所有功能 */
  disableAll(): void {
    this.flags = { ...DEFAULT_FLAGS };
  }

  /** 仅启用低风险功能（推荐初次集成使用） */
  enableSafe(): void {
    this.flags = {
      ...DEFAULT_FLAGS,
      enableRetry: true,
      enablePerformanceMonitor: true,
      enableVisualization: true,
    };
  }

  /** 查询单个开关 */
  isEnabled(flag: keyof OptimizationFlags): boolean {
    return this.flags[flag];
  }
}

export const optimizationConfig = new OptimizationConfig();
