/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmartRetryManager } from './retryManager';

describe('SmartRetryManager', () => {
  let retryManager: SmartRetryManager;

  beforeEach(() => {
    retryManager = new SmartRetryManager();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockFn = vi.fn().mockResolvedValue({ success: true });
      const validator = (result: any) => result.success === true;

      const result = await retryManager.executeWithRetry(
        mockFn,
        validator,
        { maxRetries: 3, baseDelay: 100 }
      );

      expect(result).toEqual({ success: true });
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      let attempts = 0;
      const mockFn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          return { success: false };
        }
        return { success: true };
      });
      const validator = (result: any) => result.success === true;

      const result = await retryManager.executeWithRetry(
        mockFn,
        validator,
        { maxRetries: 3, baseDelay: 100 }
      );

      expect(result).toEqual({ success: true });
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const mockFn = vi.fn().mockResolvedValue({ success: false });
      const validator = (result: any) => result.success === true;

      await expect(
        retryManager.executeWithRetry(mockFn, validator, {
          maxRetries: 2,
          baseDelay: 100,
        })
      ).rejects.toThrow('Failed after 2 attempts');

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should provide retry context to function', async () => {
      const attempts: number[] = [];
      const mockFn = vi.fn().mockImplementation(async (context) => {
        attempts.push(context.attempt);
        // 第一次调用失败，第二次成功
        if (attempts.length === 1) {
          return { success: false };
        }
        return { success: true };
      });
      const validator = (result: any) => result.success === true;

      await retryManager.executeWithRetry(mockFn, validator, {
        maxRetries: 3,
        baseDelay: 100,
      });

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(attempts).toEqual([1, 2]);
    });

    it('should handle exceptions and retry', async () => {
      let attempts = 0;
      const mockFn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary error');
        }
        return { success: true };
      });
      const validator = (result: any) => result.success === true;

      const result = await retryManager.executeWithRetry(
        mockFn,
        validator,
        { maxRetries: 3, baseDelay: 100 }
      );

      expect(result).toEqual({ success: true });
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should apply exponential backoff', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      vi.spyOn(global, 'setTimeout').mockImplementation(((
        callback: any,
        delay: number
      ) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0);
      }) as any);

      const mockFn = vi.fn()
        .mockResolvedValueOnce({ success: false })
        .mockResolvedValueOnce({ success: false })
        .mockResolvedValueOnce({ success: true });
      const validator = (result: any) => result.success === true;

      await retryManager.executeWithRetry(mockFn, validator, {
        maxRetries: 3,
        baseDelay: 1000,
        backoffMultiplier: 2,
      });

      expect(delays.length).toBeGreaterThan(0);
      // First retry: 1000ms, Second retry: 2000ms
      expect(delays[0]).toBe(1000);
      expect(delays[1]).toBe(2000);

      vi.restoreAllMocks();
    });

    it('should respect max delay', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      vi.spyOn(global, 'setTimeout').mockImplementation(((
        callback: any,
        delay: number
      ) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0);
      }) as any);

      const mockFn = vi.fn()
        .mockResolvedValueOnce({ success: false })
        .mockResolvedValueOnce({ success: false })
        .mockResolvedValueOnce({ success: true });
      const validator = (result: any) => result.success === true;

      await retryManager.executeWithRetry(mockFn, validator, {
        maxRetries: 3,
        baseDelay: 5000,
        maxDelay: 8000,
        backoffMultiplier: 2,
      });

      // Second retry would be 10000ms, but should be capped at 8000ms
      expect(delays[1]).toBeLessThanOrEqual(8000);

      vi.restoreAllMocks();
    });
  });
});
