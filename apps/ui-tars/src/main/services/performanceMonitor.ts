/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 性能监控服务
 * 实时监控性能指标、识别瓶颈、生成报告
 */
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// 使用条件导入避免测试环境问题
let logger: any;
let app: any;
try {
  logger = require('@main/logger').logger;
  app = require('electron').app;
} catch {
  // 测试环境使用简单的实现
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };
  app = {
    getPath: (_name: string) => path.join(os.tmpdir(), 'ui-tars-test'),
  };
}

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  count: number;
  total: number;
  average: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private activeTimers: Map<string, number> = new Map();
  private logPath: string;
  private autoSaveInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.logPath = path.join(
      app.getPath('userData'),
      'logs',
      'performance.json'
    );
  }

  /**
   * 开始计时
   */
  start(name: string, metadata?: Record<string, any>): void {
    const key = this.generateKey(name, metadata);
    this.activeTimers.set(key, performance.now());
  }

  /**
   * 结束计时并记录
   */
  end(name: string, metadata?: Record<string, any>): number {
    const key = this.generateKey(name, metadata);
    const startTime = this.activeTimers.get(key);

    if (!startTime) {
      logger.warn(`[Performance] No start time found for: ${name}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.activeTimers.delete(key);

    // 记录指标
    this.record(name, duration, metadata);

    return duration;
  }

  /**
   * 测量异步函数执行时间
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      this.record(name, duration, metadata);
      logger.debug(`[Performance] ${name} took ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.record(name, duration, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * 测量同步函数执行时间
   */
  measureSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    const startTime = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - startTime;
      this.record(name, duration, metadata);
      logger.debug(`[Performance] ${name} took ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.record(name, duration, { ...metadata, error: true });
      throw error;
    }
  }

  /**
   * 记录指标
   */
  private record(
    name: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push(metric);

    // 记录慢操作
    if (duration > 1000) {
      logger.warn(
        `[Performance] Slow operation: ${name} took ${duration.toFixed(2)}ms`,
        metadata
      );
    }

    // 限制每个指标的历史记录数量（最多保留 1000 条）
    const metricList = this.metrics.get(name)!;
    if (metricList.length > 1000) {
      metricList.shift();
    }
  }

  /**
   * 获取统计信息
   */
  getStats(name: string): PerformanceStats | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
    const total = durations.reduce((sum, d) => sum + d, 0);

    return {
      count: durations.length,
      total,
      average: total / durations.length,
      min: durations[0],
      max: durations[durations.length - 1],
      p50: this.percentile(durations, 0.5),
      p95: this.percentile(durations, 0.95),
      p99: this.percentile(durations, 0.99),
    };
  }

  /**
   * 获取所有统计信息
   */
  getAllStats(): Map<string, PerformanceStats> {
    const stats = new Map<string, PerformanceStats>();

    for (const [name] of this.metrics) {
      const stat = this.getStats(name);
      if (stat) {
        stats.set(name, stat);
      }
    }

    return stats;
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    const stats = this.getAllStats();
    const lines: string[] = [
      '='.repeat(80),
      'Performance Report',
      `Generated at: ${new Date().toISOString()}`,
      '='.repeat(80),
      '',
    ];

    // 按平均时间排序
    const sortedStats = Array.from(stats.entries()).sort(
      (a, b) => b[1].average - a[1].average
    );

    for (const [name, stat] of sortedStats) {
      lines.push(`${name}:`);
      lines.push(`  Count:   ${stat.count}`);
      lines.push(`  Average: ${stat.average.toFixed(2)}ms`);
      lines.push(`  Min:     ${stat.min.toFixed(2)}ms`);
      lines.push(`  Max:     ${stat.max.toFixed(2)}ms`);
      lines.push(`  P50:     ${stat.p50.toFixed(2)}ms`);
      lines.push(`  P95:     ${stat.p95.toFixed(2)}ms`);
      lines.push(`  P99:     ${stat.p99.toFixed(2)}ms`);
      lines.push('');
    }

    lines.push('='.repeat(80));
    return lines.join('\n');
  }

  /**
   * 获取慢操作列表
   */
  getSlowOperations(threshold = 1000): PerformanceMetric[] {
    const slowOps: PerformanceMetric[] = [];

    for (const metrics of this.metrics.values()) {
      for (const metric of metrics) {
        if (metric.duration > threshold) {
          slowOps.push(metric);
        }
      }
    }

    // 按时长降序排序
    return slowOps.sort((a, b) => b.duration - a.duration);
  }

  /**
   * 保存性能数据
   */
  async save(): Promise<void> {
    try {
      const data = {
        timestamp: Date.now(),
        stats: Object.fromEntries(this.getAllStats()),
        slowOperations: this.getSlowOperations(1000).slice(0, 50), // 只保存前 50 个
      };

      await fs.mkdir(path.dirname(this.logPath), { recursive: true });
      await fs.writeFile(this.logPath, JSON.stringify(data, null, 2));

      logger.info(`[Performance] Saved metrics to ${this.logPath}`);
    } catch (error) {
      logger.error('[Performance] Failed to save metrics:', error);
    }
  }

  /**
   * 加载历史数据
   */
  async load(): Promise<void> {
    try {
      const content = await fs.readFile(this.logPath, 'utf-8');
      const data = JSON.parse(content);

      logger.info(
        `[Performance] Loaded metrics from ${this.logPath}`,
        `(${data.timestamp})`
      );
    } catch (error) {
      logger.debug('[Performance] No previous metrics found');
    }
  }

  /**
   * 清除所有指标
   */
  clear(): void {
    this.metrics.clear();
    this.activeTimers.clear();
    logger.info('[Performance] All metrics cleared');
  }

  /**
   * 启用自动保存
   */
  enableAutoSave(intervalMs = 60000): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      this.save().catch((error) => {
        logger.error('[Performance] Auto-save failed:', error);
      });
    }, intervalMs);

    logger.info(`[Performance] Auto-save enabled (interval: ${intervalMs}ms)`);
  }

  /**
   * 禁用自动保存
   */
  disableAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      logger.info('[Performance] Auto-save disabled');
    }
  }

  /**
   * 计算百分位数
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * 生成唯一键
   */
  private generateKey(name: string, metadata?: Record<string, any>): string {
    return metadata ? `${name}:${JSON.stringify(metadata)}` : name;
  }

  /**
   * 获取实时性能快照
   */
  getSnapshot(): {
    activeTimers: number;
    totalMetrics: number;
    recentSlowOps: number;
  } {
    const recentSlowOps = this.getSlowOperations(1000).filter(
      (m) => Date.now() - m.timestamp < 60000 // 最近 1 分钟
    ).length;

    return {
      activeTimers: this.activeTimers.size,
      totalMetrics: Array.from(this.metrics.values()).reduce(
        (sum, arr) => sum + arr.length,
        0
      ),
      recentSlowOps,
    };
  }
}

// 导出单例
export const performanceMonitor = new PerformanceMonitor();
