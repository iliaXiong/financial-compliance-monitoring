// Basic property test to verify fast-check integration

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

describe('Property-Based Testing Setup', () => {
  it('should have fast-check configured', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n === n; // Identity property
      }),
      { numRuns: 100 }
    );
  });

  it('should support string generation', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        return s.length >= 0; // Strings have non-negative length
      }),
      { numRuns: 100 }
    );
  });
});
