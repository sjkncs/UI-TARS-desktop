/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ModelRegistry, ModelConfig } from './modelRegistry';

describe('ModelRegistry', () => {
  let registry: ModelRegistry;
  let testModel: ModelConfig;

  beforeEach(() => {
    registry = new ModelRegistry();
    testModel = {
      id: 'test-model-1',
      name: 'Test Model 1',
      provider: 'test-provider',
      baseUrl: 'https://api.test.com',
      apiKey: 'test-key',
      modelName: 'test-model',
      priority: 1,
      enabled: true,
      capabilities: {
        vision: true,
        reasoning: true,
        speed: 'fast',
        accuracy: 'high',
      },
    };
  });

  describe('registerModel', () => {
    it('should register a model successfully', () => {
      registry.registerModel(testModel);
      const retrieved = registry.getModel(testModel.id);
      expect(retrieved).toEqual(testModel);
    });

    it('should initialize performance data for new model', () => {
      registry.registerModel(testModel);
      const perf = registry.getPerformance(testModel.id);
      expect(perf).toBeDefined();
      expect(perf?.totalRequests).toBe(0);
    });
  });

  describe('getEnabledModels', () => {
    it('should return only enabled models', () => {
      const model2 = { ...testModel, id: 'test-2', enabled: false };
      registry.registerModel(testModel);
      registry.registerModel(model2);

      const enabled = registry.getEnabledModels();
      expect(enabled.length).toBe(1);
      expect(enabled[0].id).toBe(testModel.id);
    });
  });

  describe('updatePerformance', () => {
    it('should update performance metrics correctly', () => {
      registry.registerModel(testModel);
      
      registry.updatePerformance(testModel.id, true, 100);
      registry.updatePerformance(testModel.id, true, 200);
      registry.updatePerformance(testModel.id, false, 150);

      const perf = registry.getPerformance(testModel.id);
      expect(perf?.totalRequests).toBe(3);
      expect(perf?.successfulRequests).toBe(2);
      expect(perf?.failedRequests).toBe(1);
      expect(perf?.errorRate).toBeCloseTo(1/3);
    });
  });

  describe('getBestModel', () => {
    it('should return model with best performance', () => {
      const model2 = { ...testModel, id: 'test-2', priority: 2 };
      registry.registerModel(testModel);
      registry.registerModel(model2);

      // 给第一个模型较差的性能
      registry.updatePerformance('test-model-1', false, 2000);
      registry.updatePerformance('test-model-1', true, 1500);

      // 给第二个模型更好的性能
      registry.updatePerformance('test-2', true, 50);
      registry.updatePerformance('test-2', true, 60);

      const best = registry.getBestModel();
      expect(best?.id).toBe('test-2');
    });
  });

  describe('getHealthyModels', () => {
    it('should filter out unhealthy models', () => {
      const model2 = { ...testModel, id: 'test-2' };
      registry.registerModel(testModel);
      registry.registerModel(model2);

      // 让第一个模型失败率高
      registry.updatePerformance(testModel.id, false, 100);
      registry.updatePerformance(testModel.id, false, 100);
      registry.updatePerformance(testModel.id, true, 100);

      const healthy = registry.getHealthyModels(0.5);
      expect(healthy.length).toBe(1);
      expect(healthy[0].id).toBe('test-2');
    });
  });
});
