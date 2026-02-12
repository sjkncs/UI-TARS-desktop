/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PerformanceMonitor } from './performanceMonitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  afterEach(() => {
    monitor.clear();
    monitor.disableAutoSave();
  });

  describe('start and end', () => {
    it('should measure time correctly', () => {
      monitor.start('test-operation');
      
      // 模拟一些工作
      const start = Date.now();
      while (Date.now() - start < 5) {
        // 等待至少 5ms
      }
      
      const duration = monitor.end('test-operation');
      
      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(1000);
    });

    it('should return 0 if no start time found', () => {
      const duration = monitor.end('non-existent');
      expect(duration).toBe(0);
    });
  });

  describe('measure', () => {
    it('should measure async function execution', async () => {
      const result = await monitor.measure('async-test', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'success';
      });

      expect(result).toBe('success');
      
      const stats = monitor.getStats('async-test');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
      expect(stats!.average).toBeGreaterThanOrEqual(10);
    });

    it('should handle errors in async functions', async () => {
      await expect(
        monitor.measure('error-test', async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      const stats = monitor.getStats('error-test');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
    });
  });

  describe('measureSync', () => {
    it('should measure sync function execution', () => {
      const result = monitor.measureSync('sync-test', () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      });

      expect(result).toBe(499500);
      
      const stats = monitor.getStats('sync-test');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should calculate statistics correctly', async () => {
      // 记录多个测量值
      for (let i = 0; i < 10; i++) {
        await monitor.measure('multi-test', async () => {
          await new Promise((resolve) => setTimeout(resolve, i * 2));
        });
      }

      const stats = monitor.getStats('multi-test');
      
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(10);
      expect(stats!.min).toBeLessThan(stats!.max);
      expect(stats!.average).toBeGreaterThan(0);
      expect(stats!.p50).toBeGreaterThan(0);
      expect(stats!.p95).toBeGreaterThan(0);
      expect(stats!.p99).toBeGreaterThan(0);
    });

    it('should return null for non-existent metric', () => {
      const stats = monitor.getStats('non-existent');
      expect(stats).toBeNull();
    });
  });

  describe('getAllStats', () => {
    it('should return all statistics', async () => {
      await monitor.measure('test-1', async () => {});
      await monitor.measure('test-2', async () => {});
      
      const allStats = monitor.getAllStats();
      
      expect(allStats.size).toBe(2);
      expect(allStats.has('test-1')).toBe(true);
      expect(allStats.has('test-2')).toBe(true);
    });
  });

  describe('generateReport', () => {
    it('should generate formatted report', async () => {
      await monitor.measure('operation-1', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      
      const report = monitor.generateReport();
      
      expect(report).toContain('Performance Report');
      expect(report).toContain('operation-1');
      expect(report).toContain('Average:');
      expect(report).toContain('P95:');
    });
  });

  describe('getSlowOperations', () => {
    it('should identify slow operations', async () => {
      // 快速操作
      await monitor.measure('fast-op', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      
      // 慢操作
      await monitor.measure('slow-op', async () => {
        await new Promise((resolve) => setTimeout(resolve, 1100));
      });
      
      const slowOps = monitor.getSlowOperations(1000);
      
      expect(slowOps.length).toBe(1);
      expect(slowOps[0].name).toBe('slow-op');
      expect(slowOps[0].duration).toBeGreaterThan(1000);
    });
  });

  describe('clear', () => {
    it('should clear all metrics', async () => {
      await monitor.measure('test', async () => {});
      
      expect(monitor.getStats('test')).not.toBeNull();
      
      monitor.clear();
      
      expect(monitor.getStats('test')).toBeNull();
    });
  });

  describe('getSnapshot', () => {
    it('should return current snapshot', async () => {
      monitor.start('active-1');
      monitor.start('active-2');
      
      await monitor.measure('completed', async () => {});
      
      const snapshot = monitor.getSnapshot();
      
      expect(snapshot.activeTimers).toBe(2);
      expect(snapshot.totalMetrics).toBeGreaterThan(0);
    });
  });

  describe('auto-save', () => {
    it('should enable and disable auto-save', () => {
      monitor.enableAutoSave(1000);
      monitor.disableAutoSave();
      
      // 测试通过表示没有抛出错误
      expect(true).toBe(true);
    });
  });
});
