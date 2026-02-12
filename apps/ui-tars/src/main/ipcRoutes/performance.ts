/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 性能监控 IPC 路由
 */
import { ipcMain } from 'electron';
import { performanceMonitor } from '../services/performanceMonitor';

export function registerPerformanceRoutes() {
  // 获取所有统计信息
  ipcMain.handle('performance:getStats', async () => {
    return Object.fromEntries(performanceMonitor.getAllStats());
  });

  // 获取单个指标统计
  ipcMain.handle('performance:getStat', async (_, name: string) => {
    return performanceMonitor.getStats(name);
  });

  // 生成性能报告
  ipcMain.handle('performance:getReport', async () => {
    return performanceMonitor.generateReport();
  });

  // 获取慢操作列表
  ipcMain.handle('performance:getSlowOps', async (_, threshold?: number) => {
    return performanceMonitor.getSlowOperations(threshold);
  });

  // 获取实时快照
  ipcMain.handle('performance:getSnapshot', async () => {
    return performanceMonitor.getSnapshot();
  });

  // 清除所有指标
  ipcMain.handle('performance:clear', async () => {
    performanceMonitor.clear();
  });

  // 保存性能数据
  ipcMain.handle('performance:save', async () => {
    await performanceMonitor.save();
  });

  // 启用自动保存
  ipcMain.handle('performance:enableAutoSave', async (_, intervalMs?: number) => {
    performanceMonitor.enableAutoSave(intervalMs);
  });

  // 禁用自动保存
  ipcMain.handle('performance:disableAutoSave', async () => {
    performanceMonitor.disableAutoSave();
  });
}
