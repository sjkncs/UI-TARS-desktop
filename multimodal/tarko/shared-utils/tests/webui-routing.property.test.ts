import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createPathMatcher, extractActualBasename } from '../src';

describe('createPathMatcher - property-based tests', () => {
  const arbitraryPathSegment = fc.stringMatching(/^[a-z0-9-]{1,12}$/);
  const arbitraryStaticBase = arbitraryPathSegment.map((s) => `/${s}`);

  it('static base: test() should match paths starting with base', () => {
    fc.assert(
      fc.property(arbitraryStaticBase, arbitraryPathSegment, (base, suffix) => {
        const matcher = createPathMatcher(base);
        expect(matcher.test(base)).toBe(true);
        expect(matcher.test(`${base}/${suffix}`)).toBe(true);
      }),
    );
  });

  it('static base: test() should reject unrelated paths', () => {
    fc.assert(
      fc.property(arbitraryStaticBase, arbitraryStaticBase, (base, other) => {
        fc.pre(base !== other && !other.startsWith(base + '/'));
        const matcher = createPathMatcher(base);
        expect(matcher.test(other)).toBe(false);
      }),
    );
  });

  it('static base: extract() should return / for exact base match', () => {
    fc.assert(
      fc.property(arbitraryStaticBase, (base) => {
        const matcher = createPathMatcher(base);
        expect(matcher.extract(base)).toBe('/');
      }),
    );
  });

  it('static base: extract() should strip base prefix from matching paths', () => {
    fc.assert(
      fc.property(arbitraryStaticBase, arbitraryPathSegment, (base, suffix) => {
        const matcher = createPathMatcher(base);
        const result = matcher.extract(`${base}/${suffix}`);
        expect(result).toBe(`/${suffix}`);
      }),
    );
  });

  it('undefined base: should match any path', () => {
    fc.assert(
      fc.property(fc.string(), (path) => {
        const matcher = createPathMatcher(undefined);
        expect(matcher.test(path)).toBe(true);
        expect(matcher.extract(path)).toBe(path);
      }),
    );
  });
});

describe('extractActualBasename - property-based tests', () => {
  const arbitraryPathSegment = fc.stringMatching(/^[a-z0-9-]{1,12}$/);
  const arbitraryStaticBase = arbitraryPathSegment.map((s) => `/${s}`);

  it('should return empty string for undefined base', () => {
    fc.assert(
      fc.property(fc.string(), (path) => {
        expect(extractActualBasename(undefined, path)).toBe('');
      }),
    );
  });

  it('static base: should return base when path matches', () => {
    fc.assert(
      fc.property(arbitraryStaticBase, arbitraryPathSegment, (base, suffix) => {
        expect(extractActualBasename(base, `${base}/${suffix}`)).toBe(base);
      }),
    );
  });
});
