/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 工作流类型定义
 */

export interface WorkflowStep {
  id: string;
  type: 'action' | 'condition' | 'loop' | 'wait';
  timestamp: number;
  action?: {
    type: string;
    inputs: Record<string, any>;
    description?: string;
  };
  condition?: {
    type: 'text_exists' | 'element_visible' | 'custom';
    expression: string;
    timeout?: number;
  };
  loop?: {
    maxIterations: number;
    condition: string;
  };
  wait?: {
    duration: number;
    reason?: string;
  };
  metadata?: {
    screenshot?: string;
    context?: string;
    notes?: string;
  };
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  version: string;
  createdAt: number;
  updatedAt: number;
  author?: string;
  tags: string[];
  steps: WorkflowStep[];
  variables?: Record<string, any>;
  settings?: {
    retryOnFailure?: boolean;
    maxRetries?: number;
    timeout?: number;
    continueOnError?: boolean;
  };
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
  startTime: number;
  endTime?: number;
  currentStep: number;
  totalSteps: number;
  results: WorkflowStepResult[];
  error?: Error;
  variables?: Record<string, any>;
}

export interface WorkflowStepResult {
  stepId: string;
  status: 'success' | 'failed' | 'skipped';
  startTime: number;
  endTime: number;
  duration: number;
  output?: any;
  error?: Error;
  screenshot?: string;
  retries?: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedDuration: number;
  workflow: Workflow;
  examples?: string[];
}
