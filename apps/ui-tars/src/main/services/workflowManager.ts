/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 工作流管理器
 * 统一管理工作流的录制、存储、执行和模板
 */

import { Workflow, WorkflowExecution, WorkflowTemplate } from './workflowTypes';
import { workflowRecorder } from './workflowRecorder';
import { workflowPlayer, WorkflowPlayerOptions } from './workflowPlayer';
import { performanceMonitor } from './performanceMonitor';
import * as fs from 'fs';
import * as path from 'path';

// 使用条件导入避免测试环境问题
let logger: any;
let app: any;

try {
  logger = require('@main/logger').logger;
  app = require('electron').app;
} catch {
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };
  app = {
    getPath: (_name: string) => {
      if (typeof process !== 'undefined' && process.env.TEMP) {
        return path.join(process.env.TEMP, 'ui-tars-test');
      }
      return '/tmp/ui-tars-test';
    },
  };
}

export class WorkflowManager {
  private workflows: Map<string, Workflow> = new Map();
  private templates: Map<string, WorkflowTemplate> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private workflowsDir: string;

  constructor() {
    this.workflowsDir = path.join(app.getPath('userData'), 'workflows');
    this.ensureWorkflowsDir();
    logger.info('[WorkflowManager] Initialized');
  }

  /**
   * 确保工作流目录存在
   */
  private ensureWorkflowsDir(): void {
    try {
      if (!fs.existsSync(this.workflowsDir)) {
        fs.mkdirSync(this.workflowsDir, { recursive: true });
      }
    } catch (error) {
      logger.error('[WorkflowManager] Failed to create workflows directory:', error);
    }
  }

  /**
   * 保存工作流
   */
  async saveWorkflow(workflow: Workflow): Promise<void> {
    return await performanceMonitor.measure('workflow.save', async () => {
      this.workflows.set(workflow.id, workflow);

      const filePath = path.join(this.workflowsDir, `${workflow.id}.json`);
      try {
        fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2), 'utf-8');
        logger.info(`[WorkflowManager] Saved workflow: ${workflow.name}`);
      } catch (error) {
        logger.error('[WorkflowManager] Failed to save workflow:', error);
        throw error;
      }
    });
  }

  /**
   * 加载工作流
   */
  async loadWorkflow(workflowId: string): Promise<Workflow | null> {
    return await performanceMonitor.measure('workflow.load', async () => {
      // 先从内存查找
      if (this.workflows.has(workflowId)) {
        return this.workflows.get(workflowId)!;
      }

      // 从文件加载
      const filePath = path.join(this.workflowsDir, `${workflowId}.json`);
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const workflow = JSON.parse(content) as Workflow;
          this.workflows.set(workflow.id, workflow);
          logger.info(`[WorkflowManager] Loaded workflow: ${workflow.name}`);
          return workflow;
        }
      } catch (error) {
        logger.error('[WorkflowManager] Failed to load workflow:', error);
      }

      return null;
    });
  }

  /**
   * 加载所有工作流
   */
  async loadAllWorkflows(): Promise<Workflow[]> {
    return await performanceMonitor.measure('workflow.loadAll', async () => {
      const workflows: Workflow[] = [];

      try {
        const files = fs.readdirSync(this.workflowsDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(this.workflowsDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const workflow = JSON.parse(content) as Workflow;
            this.workflows.set(workflow.id, workflow);
            workflows.push(workflow);
          }
        }
        logger.info(`[WorkflowManager] Loaded ${workflows.length} workflows`);
      } catch (error) {
        logger.error('[WorkflowManager] Failed to load workflows:', error);
      }

      return workflows;
    });
  }

  /**
   * 删除工作流
   */
  async deleteWorkflow(workflowId: string): Promise<boolean> {
    return await performanceMonitor.measure('workflow.delete', async () => {
      this.workflows.delete(workflowId);

      const filePath = path.join(this.workflowsDir, `${workflowId}.json`);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info(`[WorkflowManager] Deleted workflow: ${workflowId}`);
          return true;
        }
      } catch (error) {
        logger.error('[WorkflowManager] Failed to delete workflow:', error);
      }

      return false;
    });
  }

  /**
   * 获取所有工作流
   */
  getAllWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * 搜索工作流
   */
  searchWorkflows(query: string): Workflow[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllWorkflows().filter(workflow =>
      workflow.name.toLowerCase().includes(lowerQuery) ||
      workflow.description.toLowerCase().includes(lowerQuery) ||
      workflow.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 开始录制
   */
  startRecording(name: string, description: string = ''): void {
    workflowRecorder.startRecording(name, description);
  }

  /**
   * 停止录制并保存
   */
  async stopRecordingAndSave(): Promise<Workflow | null> {
    const workflow = workflowRecorder.stopRecording();
    if (workflow) {
      await this.saveWorkflow(workflow);
      return workflow;
    }
    return null;
  }

  /**
   * 执行工作流
   */
  async executeWorkflow(
    workflowId: string,
    executor: (step: any) => Promise<any>,
    options?: WorkflowPlayerOptions
  ): Promise<WorkflowExecution> {
    const workflow = await this.loadWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const execution = await workflowPlayer.execute(workflow, executor, options);
    this.executions.set(execution.id, execution);

    return execution;
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(workflowId?: string): WorkflowExecution[] {
    const executions = Array.from(this.executions.values());
    if (workflowId) {
      return executions.filter(e => e.workflowId === workflowId);
    }
    return executions;
  }

  /**
   * 注册模板
   */
  registerTemplate(template: WorkflowTemplate): void {
    this.templates.set(template.id, template);
    logger.info(`[WorkflowManager] Registered template: ${template.name}`);
  }

  /**
   * 从模板创建工作流
   */
  createFromTemplate(templateId: string, name: string): Workflow | null {
    const template = this.templates.get(templateId);
    if (!template) {
      logger.error(`[WorkflowManager] Template not found: ${templateId}`);
      return null;
    }

    const workflow: Workflow = {
      ...template.workflow,
      id: this.generateId(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.workflows.set(workflow.id, workflow);
    logger.info(`[WorkflowManager] Created workflow from template: ${name}`);

    return workflow;
  }

  /**
   * 获取所有模板
   */
  getAllTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 导出工作流
   */
  exportWorkflow(workflowId: string): string | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return null;
    }

    return JSON.stringify(workflow, null, 2);
  }

  /**
   * 导入工作流
   */
  async importWorkflow(workflowJson: string): Promise<Workflow | null> {
    try {
      const workflow = JSON.parse(workflowJson) as Workflow;
      workflow.id = this.generateId(); // 生成新ID
      workflow.createdAt = Date.now();
      workflow.updatedAt = Date.now();

      await this.saveWorkflow(workflow);
      logger.info(`[WorkflowManager] Imported workflow: ${workflow.name}`);

      return workflow;
    } catch (error) {
      logger.error('[WorkflowManager] Failed to import workflow:', error);
      return null;
    }
  }

  /**
   * 生成统计报告
   */
  generateReport(): string {
    const lines: string[] = [
      '='.repeat(80),
      'Workflow Manager Report',
      `Generated at: ${new Date().toISOString()}`,
      '='.repeat(80),
      '',
      `Total Workflows: ${this.workflows.size}`,
      `Total Templates: ${this.templates.size}`,
      `Total Executions: ${this.executions.size}`,
      '',
      'Workflows:',
      '',
    ];

    for (const workflow of this.workflows.values()) {
      lines.push(`${workflow.name} (${workflow.id}):`);
      lines.push(`  Steps: ${workflow.steps.length}`);
      lines.push(`  Created: ${new Date(workflow.createdAt).toISOString()}`);
      lines.push(`  Tags: ${workflow.tags.join(', ') || 'None'}`);
      lines.push('');
    }

    lines.push('Recent Executions:');
    lines.push('');

    const recentExecutions = Array.from(this.executions.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, 10);

    for (const exec of recentExecutions) {
      const workflow = this.workflows.get(exec.workflowId);
      lines.push(`${workflow?.name || exec.workflowId}:`);
      lines.push(`  Status: ${exec.status}`);
      lines.push(`  Steps: ${exec.currentStep}/${exec.totalSteps}`);
      if (exec.endTime) {
        lines.push(`  Duration: ${exec.endTime - exec.startTime}ms`);
      }
      lines.push('');
    }

    lines.push('='.repeat(80));
    return lines.join('\n');
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清除所有数据
   */
  clear(): void {
    this.workflows.clear();
    this.templates.clear();
    this.executions.clear();
    logger.info('[WorkflowManager] Cleared all data');
  }
}

// 导出单例
export const workflowManager = new WorkflowManager();
