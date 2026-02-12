/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 可视化 IPC 路由
 * 为渲染进程提供性能监控、工作流和模型状态的可视化数据
 */

import { ipcMain } from 'electron';
import { performanceMonitor } from '../services/performanceMonitor';
import { modelManager } from '../services/modelManager';
import { workflowManager } from '../services/workflowManager';

/**
 * 注册可视化相关的 IPC 路由
 */
export function registerVisualizationRoutes(): void {
  // 获取性能仪表盘数据
  ipcMain.handle('visualization:getPerformanceDashboard', async () => {
    const allStats = performanceMonitor.getAllStats();
    const slowOps = performanceMonitor.getSlowOperations(1000);
    
    return {
      stats: Array.from(allStats.entries()).map(([name, stats]) => ({
        name,
        ...stats,
      })),
      slowOperations: slowOps,
      summary: {
        totalOperations: Array.from(allStats.values()).reduce(
          (sum, s) => sum + s.count,
          0
        ),
        averageLatency:
          Array.from(allStats.values()).reduce(
            (sum, s) => sum + s.average,
            0
          ) / allStats.size || 0,
        slowOperationCount: slowOps.length,
      },
    };
  });

  // 获取模型状态
  ipcMain.handle('visualization:getModelStatus', async () => {
    const allModels = modelManager.getAllModels();
    const allPerformance = modelManager.getAllPerformance();
    const bestModel = modelManager.getBestModel();

    return {
      models: allModels.map(model => ({
        ...model,
        performance: allPerformance.get(model.id),
        isBest: bestModel?.id === model.id,
      })),
      bestModelId: bestModel?.id,
      totalModels: allModels.length,
      enabledModels: allModels.filter(m => m.enabled).length,
    };
  });

  // 获取工作流统计
  ipcMain.handle('visualization:getWorkflowStats', async () => {
    const allWorkflows = workflowManager.getAllWorkflows();
    const executionHistory = workflowManager.getExecutionHistory();

    const recentExecutions = executionHistory
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, 10);

    return {
      totalWorkflows: allWorkflows.length,
      totalExecutions: executionHistory.length,
      recentExecutions: recentExecutions.map(exec => {
        const workflow = allWorkflows.find(w => w.id === exec.workflowId);
        return {
          ...exec,
          workflowName: workflow?.name || 'Unknown',
          duration: exec.endTime ? exec.endTime - exec.startTime : null,
        };
      }),
      workflows: allWorkflows.map(workflow => ({
        id: workflow.id,
        name: workflow.name,
        stepCount: workflow.steps.length,
        createdAt: workflow.createdAt,
        tags: workflow.tags,
      })),
    };
  });

  // 获取实时监控数据
  ipcMain.handle('visualization:getRealtimeData', async () => {
    const perfSnapshot = performanceMonitor.getSnapshot();
    const currentExecution = workflowManager['workflowPlayer']?.getCurrentExecution();

    return {
      performance: perfSnapshot,
      currentWorkflow: currentExecution
        ? {
            id: currentExecution.id,
            workflowId: currentExecution.workflowId,
            status: currentExecution.status,
            progress: {
              current: currentExecution.currentStep,
              total: currentExecution.totalSteps,
              percentage:
                (currentExecution.currentStep / currentExecution.totalSteps) * 100,
            },
          }
        : null,
      timestamp: Date.now(),
    };
  });

  // 获取性能趋势数据
  ipcMain.handle('visualization:getPerformanceTrends', async (_, metricName: string) => {
    const stats = performanceMonitor.getStats(metricName);
    if (!stats) {
      return null;
    }

    // 简化版趋势数据，实际应该从历史记录中获取
    return {
      name: metricName,
      current: stats,
      trend: 'stable', // 'improving' | 'stable' | 'degrading'
      history: [], // 历史数据点
    };
  });

  // 获取完整的可视化报告
  ipcMain.handle('visualization:getFullReport', async () => {
    const perfReport = performanceMonitor.generateReport();
    const modelReport = modelManager.generateReport();
    const workflowReport = workflowManager.generateReport();

    return {
      performance: perfReport,
      models: modelReport,
      workflows: workflowReport,
      generatedAt: new Date().toISOString(),
    };
  });

  console.log('[IPC] Visualization routes registered');
}
