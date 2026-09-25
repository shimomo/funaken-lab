import { describe, expect, it } from 'vitest';
import { bootstrapRoi, mulberry32, quantile } from '../src/stats.ts';

describe('mulberry32', () => {
  it('同じ seed なら同じ列を返す', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const values = Array.from({ length: 5 }, () => a());
    expect(values).toEqual(Array.from({ length: 5 }, () => b()));
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });
});

describe('quantile', () => {
  it('線形補間する', () => {
    expect(quantile([1, 2, 3, 4], 0)).toBe(1);
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(quantile([1, 2, 3, 4], 1)).toBe(4);
  });
});

describe('bootstrapRoi', () => {
  it('どのレースも同じ回収率なら区間は 1 点に縮む', () => {
    const interval = bootstrapRoi([100, 200, 300], [80, 160, 240], { samples: 200, seed: 1 });
    expect(interval?.lower).toBeCloseTo(0.8);
    expect(interval?.upper).toBeCloseTo(0.8);
  });

  it('レースが無ければ null', () => {
    expect(bootstrapRoi([], [], { samples: 10, seed: 1 })).toBeNull();
  });
});
