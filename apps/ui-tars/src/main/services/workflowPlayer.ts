/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 工作流播放器
 * 执行已录制的工作流
 */

import { Workflow, WorkflowExecution, WorkflowStep, WorkflowStepResult } from './workflowTypes';
import { performanceMonitor } from './performanceMonitor';
import { SmartRetryManager } from './retryManager';

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

export interface WorkflowPlayerOptions {
  retryOnFailure?: boolean;
  maxRetries?: number;
  continueOnError?: boolean;
  timeout?: number;
  onStepStart?: (step: WorkflowStep, index: number) => void;
  onStepComplete?: (result: WorkflowStepResult) => void;
  onProgress?: (current: number, total: number) => void;
}

export class WorkflowPlayer {
  private currentExecution: WorkflowExecution | null = null;
  private isPaused: boolean = false;
  private isCancelled: boolean = false;
  private retryManager: SmartRetryManager;

  constructor() {
    this.retryManager = new SmartRetryManager();
    logger.info('[WorkflowPlayer] Initialized');
  }

  /**
   * 执行工作流
   */
  async execute(
    workflow: Workflow,
    executor: (step: WorkflowStep) => Promise<any>,
    options: WorkflowPlayerOptions = {}
  ): Promise<WorkflowExecution> {
    return await performanceMonitor.measure('workflow.execute', async () => {
      if (this.currentExecution?.status === 'running') {
        throw new Error('Another workflow is already running');
      }

      // 初始化执行上下文
      this.currentExecution = {
        id: this.generateExecutionId(),
        workflowId: workflow.id,
        status: 'running',
        startTime: Date.now(),
        currentStep: 0,
        totalSteps: workflow.steps.length,
        results: [],
        variables: { ...workflow.variables },
      };

      this.isPaused = false;
      this.isCancelled = false;

      logger.info(
        `[WorkflowPlayer] Starting workflow: ${workflow.name} ` +
        `(${workflow.steps.length} steps)`
      );

      try {
        // 执行所有步骤
        for (let i = 0; i < workflow.steps.length; i++) {
          // 检查是否取消
          if (this.isCancelled) {
            this.currentExecution.status = 'cancelled';
            logger.warn('[WorkflowPlayer] Workflow cancelled');
            break;
          }

          // 检查是否暂停
          while (this.isPaused && !this.isCancelled) {
            await this.sleep(100);
          }

          const step = workflow.steps[i];
          this.currentExecution.currentStep = i + 1;

          // 步骤开始回调
          if (options.onStepStart) {
            options.onStepStart(step, i);
          }

          // 执行步骤
          const result = await this.executeStep(
            step,
            executor,
            options
          );

          this.currentExecution.results.push(result);

          // 步骤完成回调
          if (options.onStepComplete) {
            options.onStepComplete(result);
          }

          // 进度回调
          if (options.onProgress) {
            options.onProgress(i + 1, workflow.steps.length);
          }

          // 检查是否失败且不继续
          if (result.status === 'failed' && !options.continueOnError) {
            this.currentExecution.status = 'failed';
            this.currentExecution.error = result.error;
            logger.error(
              `[WorkflowPlayer] Workflow failed at step ${i + 1}: ` +
              result.error?.message
            );
            break;
          }
        }

        // 设置最终状态
        if (this.currentExecution.status === 'running') {
          this.currentExecution.status = 'completed';
        }

        this.currentExecution.endTime = Date.now();

        logger.info(
          `[WorkflowPlayer] Workflow ${this.currentExecution.status}: ` +
          `${workflow.name} (${this.currentExecution.endTime - this.currentExecution.startTime}ms)`
        );

        return this.currentExecution;
      } catch (error) {
        this.currentExecution.status = 'failed';
        this.currentExecution.error = error as Error;
        this.currentExecution.endTime = Date.now();

        logger.error('[WorkflowPlayer] Workflow execution error:', error);
        return this.currentExecution;
      }
    });
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(
    step: WorkflowStep,
    executor: (step: WorkflowStep) => Promise<any>,
    options: WorkflowPlayerOptions
  ): Promise<WorkflowStepResult> {
    const startTime = Date.now();
    let retries = 0;

    logger.debug(`[WorkflowPlayer] Executing step: ${step.id} (${step.type})`);

    try {
      let output: any;

      // 根据步骤类型执行
      switch (step.type) {
        case 'action':
          // 使用重试机制执行操作
          if (options.retryOnFailure) {
            const result = await this.retryManager.executeWithRetry(
              async () => await executor(step),
              (result) => result !== null && result !== undefined,
              {
                maxRetries: options.maxRetries || 3,
                baseDelay: 1000,
              }
            );
            output = result;
            retries = this.retryManager['lastRetries'] || 0;
          } else {
            output = await executor(step);
          }
          break;

        case 'wait':
          if (step.wait) {
            await this.sleep(step.wait.duration);
            output = { waited: step.wait.duration };
          }
          break;

        case 'condition':
          if (step.condition) {
            output = await this.evaluateCondition(step, executor);
          }
          break;

        case 'loop':
          if (step.loop) {
            output = await this.executeLoop(step, executor, options);
          }
          break;

        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      const endTime = Date.now();

      return {
        stepId: step.id,
        status: 'success',
        startTime,
        endTime,
        duration: endTime - startTime,
        output,
        retries,
      };
    } catch (error) {
      const endTime = Date.now();

      logger.error(`[WorkflowPlayer] Step ${step.id} failed:`, error);

      return {
        stepId: step.id,
        status: 'failed',
        startTime,
        endTime,
        duration: endTime - startTime,
        error: error as Error,
        retries,
      };
    }
  }

  /**
   * 评估条件
   */
  private async evaluateCondition(
    step: WorkflowStep,
    executor: (step: WorkflowStep) => Promise<any>
  ): Promise<boolean> {
    if (!step.condition) {
      return false;
    }

    const timeout = step.condition.timeout || 5000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const result = await executor(step);
        if (result) {
          return true;
        }
      } catch (error) {
        // 继续等待
      }

      await this.sleep(500);
    }

    return false;
  }

  /**
   * 执行循环
   */
  private async executeLoop(
    step: WorkflowStep,
    executor: (step: WorkflowStep) => Promise<any>,
    _options: WorkflowPlayerOptions,
  ): Promise<any[]> {
    if (!step.loop) {
      return [];
    }

    const results: any[] = [];
    const maxIterations = step.loop.maxIterations;

    for (let i = 0; i < maxIterations; i++) {
      try {
        const result = await executor(step);
        results.push(result);

        // 检查循环条件
        // 这里简化处理，实际应该评估 step.loop.condition
        if (!result) {
          break;
        }
      } catch (error) {
        logger.warn(`[WorkflowPlayer] Loop iteration ${i} failed:`, error);
        break;
      }
    }

    return results;
  }

  /**
   * 暂停执行
   */
  pause(): void {
    if (!this.currentExecution || this.currentExecution.status !== 'running') {
      logger.warn('[WorkflowPlayer] No running workflow to pause');
      return;
    }

    this.isPaused = true;
    this.currentExecution.status = 'paused';
    logger.info('[WorkflowPlayer] Workflow paused');
  }

  /**
   * 恢复执行
   */
  resume(): void {
    if (!this.currentExecution || this.currentExecution.status !== 'paused') {
      logger.warn('[WorkflowPlayer] No paused workflow to resume');
      return;
    }

    this.isPaused = false;
    this.currentExecution.status = 'running';
    logger.info('[WorkflowPlayer] Workflow resumed');
  }

  /**
   * 取消执行
   */
  cancel(): void {
    if (!this.currentExecution || 
        (this.currentExecution.status !== 'running' && 
         this.currentExecution.status !== 'paused')) {
      logger.warn('[WorkflowPlayer] No workflow to cancel');
      return;
    }

    this.isCancelled = true;
    logger.info('[WorkflowPlayer] Workflow cancellation requested');
  }

  /**
   * 获取当前执行状态
   */
  getCurrentExecution(): WorkflowExecution | null {
    return this.currentExecution;
  }

  /**
   * 获取执行进度
   */
  getProgress(): {
    current: number;
    total: number;
    percentage: number;
    status: string;
  } | null {
    if (!this.currentExecution) {
      return null;
    }

    return {
      current: this.currentExecution.currentStep,
      total: this.currentExecution.totalSteps,
      percentage: (this.currentExecution.currentStep / this.currentExecution.totalSteps) * 100,
      status: this.currentExecution.status,
    };
  }

  /**
   * 生成执行ID
   */
  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 休眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清除当前执行
   */
  clear(): void {
    this.currentExecution = null;
    this.isPaused = false;
    this.isCancelled = false;
    logger.info('[WorkflowPlayer] Cleared execution');
  }
}

// 导出单例
export const workflowPlayer = new WorkflowPlayer();
