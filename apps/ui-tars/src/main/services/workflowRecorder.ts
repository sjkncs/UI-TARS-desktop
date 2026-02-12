/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 工作流录制器
 * 记录用户操作并生成可重放的工作流
 */

import { Workflow, WorkflowStep } from './workflowTypes';

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

export class WorkflowRecorder {
  private isRecording: boolean = false;
  private currentWorkflow: Workflow | null = null;
  private steps: WorkflowStep[] = [];
  private startTime: number = 0;
  private stepCounter: number = 0;

  constructor() {
    logger.info('[WorkflowRecorder] Initialized');
  }

  /**
   * 开始录制
   */
  startRecording(name: string, description: string = ''): void {
    if (this.isRecording) {
      logger.warn('[WorkflowRecorder] Already recording');
      return;
    }

    this.isRecording = true;
    this.startTime = Date.now();
    this.steps = [];
    this.stepCounter = 0;

    this.currentWorkflow = {
      id: this.generateId(),
      name,
      description,
      version: '1.0.0',
      createdAt: this.startTime,
      updatedAt: this.startTime,
      tags: [],
      steps: [],
      settings: {
        retryOnFailure: true,
        maxRetries: 3,
        continueOnError: false,
      },
    };

    logger.info(`[WorkflowRecorder] Started recording: ${name}`);
  }

  /**
   * 停止录制
   */
  stopRecording(): Workflow | null {
    if (!this.isRecording) {
      logger.warn('[WorkflowRecorder] Not recording');
      return null;
    }

    this.isRecording = false;

    if (this.currentWorkflow) {
      this.currentWorkflow.steps = this.steps;
      this.currentWorkflow.updatedAt = Date.now();
    }

    const workflow = this.currentWorkflow;
    this.currentWorkflow = null;
    this.steps = [];

    logger.info(
      `[WorkflowRecorder] Stopped recording: ${workflow?.name} ` +
      `(${workflow?.steps.length} steps)`
    );

    return workflow;
  }

  /**
   * 暂停录制
   */
  pauseRecording(): void {
    if (!this.isRecording) {
      logger.warn('[WorkflowRecorder] Not recording');
      return;
    }

    this.isRecording = false;
    logger.info('[WorkflowRecorder] Paused recording');
  }

  /**
   * 恢复录制
   */
  resumeRecording(): void {
    if (this.isRecording) {
      logger.warn('[WorkflowRecorder] Already recording');
      return;
    }

    if (!this.currentWorkflow) {
      logger.error('[WorkflowRecorder] No workflow to resume');
      return;
    }

    this.isRecording = true;
    logger.info('[WorkflowRecorder] Resumed recording');
  }

  /**
   * 记录操作步骤
   */
  recordAction(
    actionType: string,
    inputs: Record<string, any>,
    description?: string,
    screenshot?: string
  ): void {
    if (!this.isRecording) {
      return;
    }

    const step: WorkflowStep = {
      id: `step-${++this.stepCounter}`,
      type: 'action',
      timestamp: Date.now() - this.startTime,
      action: {
        type: actionType,
        inputs,
        description,
      },
      metadata: {
        screenshot,
      },
    };

    this.steps.push(step);
    logger.debug(`[WorkflowRecorder] Recorded action: ${actionType}`);
  }

  /**
   * 记录条件步骤
   */
  recordCondition(
    conditionType: 'text_exists' | 'element_visible' | 'custom',
    expression: string,
    timeout?: number
  ): void {
    if (!this.isRecording) {
      return;
    }

    const step: WorkflowStep = {
      id: `step-${++this.stepCounter}`,
      type: 'condition',
      timestamp: Date.now() - this.startTime,
      condition: {
        type: conditionType,
        expression,
        timeout,
      },
    };

    this.steps.push(step);
    logger.debug(`[WorkflowRecorder] Recorded condition: ${conditionType}`);
  }

  /**
   * 记录等待步骤
   */
  recordWait(duration: number, reason?: string): void {
    if (!this.isRecording) {
      return;
    }

    const step: WorkflowStep = {
      id: `step-${++this.stepCounter}`,
      type: 'wait',
      timestamp: Date.now() - this.startTime,
      wait: {
        duration,
        reason,
      },
    };

    this.steps.push(step);
    logger.debug(`[WorkflowRecorder] Recorded wait: ${duration}ms`);
  }

  /**
   * 记录循环步骤
   */
  recordLoop(maxIterations: number, condition: string): void {
    if (!this.isRecording) {
      return;
    }

    const step: WorkflowStep = {
      id: `step-${++this.stepCounter}`,
      type: 'loop',
      timestamp: Date.now() - this.startTime,
      loop: {
        maxIterations,
        condition,
      },
    };

    this.steps.push(step);
    logger.debug(`[WorkflowRecorder] Recorded loop: max ${maxIterations}`);
  }

  /**
   * 添加注释
   */
  addNote(stepId: string, note: string): void {
    const step = this.steps.find(s => s.id === stepId);
    if (step) {
      if (!step.metadata) {
        step.metadata = {};
      }
      step.metadata.notes = note;
      logger.debug(`[WorkflowRecorder] Added note to ${stepId}`);
    }
  }

  /**
   * 删除步骤
   */
  removeStep(stepId: string): boolean {
    const index = this.steps.findIndex(s => s.id === stepId);
    if (index !== -1) {
      this.steps.splice(index, 1);
      logger.info(`[WorkflowRecorder] Removed step: ${stepId}`);
      return true;
    }
    return false;
  }

  /**
   * 获取当前状态
   */
  getStatus(): {
    isRecording: boolean;
    workflowName: string | null;
    stepCount: number;
    duration: number;
  } {
    return {
      isRecording: this.isRecording,
      workflowName: this.currentWorkflow?.name || null,
      stepCount: this.steps.length,
      duration: this.isRecording ? Date.now() - this.startTime : 0,
    };
  }

  /**
   * 获取当前工作流（预览）
   */
  getCurrentWorkflow(): Workflow | null {
    if (!this.currentWorkflow) {
      return null;
    }

    return {
      ...this.currentWorkflow,
      steps: [...this.steps],
      updatedAt: Date.now(),
    };
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清除当前录制
   */
  clear(): void {
    this.isRecording = false;
    this.currentWorkflow = null;
    this.steps = [];
    this.stepCounter = 0;
    logger.info('[WorkflowRecorder] Cleared recording');
  }
}

// 导出单例
export const workflowRecorder = new WorkflowRecorder();
