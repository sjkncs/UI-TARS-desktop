import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { deepMerge } from '../src';

describe('deepMerge - property-based tests', () => {
  const arbitraryPlainObject = fc.dictionary(
    fc.string({ minLength: 1, maxLength: 10 }),
    fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
  );

  it('should always return an object', () => {
    fc.assert(
      fc.property(arbitraryPlainObject, arbitraryPlainObject, (target, source) => {
        const result = deepMerge(target, source);
        expect(typeof result).toBe('object');
        expect(result).not.toBeNull();
      }),
    );
  });

  it('should preserve all target keys not in source', () => {
    fc.assert(
      fc.property(arbitraryPlainObject, arbitraryPlainObject, (target, source) => {
        const result = deepMerge(target, source);
        for (const key of Object.keys(target)) {
          if (!(key in source)) {
            expect(result[key]).toEqual(target[key]);
          }
        }
      }),
    );
  });

  it('should include all source keys with defined values', () => {
    fc.assert(
      fc.property(arbitraryPlainObject, arbitraryPlainObject, (target, source) => {
        const result = deepMerge(target, source);
        for (const key of Object.keys(source)) {
          if (source[key] !== undefined) {
            expect(result).toHaveProperty(key);
          }
        }
      }),
    );
  });

  it('should not mutate target in non-destructive mode (default)', () => {
    fc.assert(
      fc.property(arbitraryPlainObject, arbitraryPlainObject, (target, source) => {
        const originalTarget = { ...target };
        deepMerge(target, source);
        expect(target).toEqual(originalTarget);
      }),
    );
  });

  it('should return target copy when source is null', () => {
    fc.assert(
      fc.property(arbitraryPlainObject, (target) => {
        const result = deepMerge(target, null);
        expect(result).toEqual(target);
        expect(result).not.toBe(target);
      }),
    );
  });

  it('should be idempotent: merge(merge(a,b),b) === merge(a,b)', () => {
    fc.assert(
      fc.property(arbitraryPlainObject, arbitraryPlainObject, (target, source) => {
        const first = deepMerge(target, source);
        const second = deepMerge(first, source);
        expect(second).toEqual(first);
      }),
    );
  });
});
