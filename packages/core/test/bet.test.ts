import { describe, expect, it } from 'vitest';
import { bet, box, combinationKey, formation, InvalidBetError } from '../src/domain/bet.ts';

describe('combinationKey', () => {
  it('着順を区別する賭式はハイフンでつなぐ', () => {
    expect(combinationKey(bet('trifecta', [4, 3, 1]))).toBe('4-3-1');
    expect(combinationKey(bet('exacta', [4, 3]))).toBe('4-3');
    expect(combinationKey(bet('win', [4]))).toBe('4');
  });

  it('着順を区別しない賭式は昇順に並べてイコールでつなぐ', () => {
    expect(combinationKey(bet('trio', [4, 1, 3]))).toBe('1=3=4');
    expect(combinationKey(bet('quinellaPlace', [4, 3]))).toBe('3=4');
  });
});

describe('formation', () => {
  it('1-23-234 を 4 点に展開する', () => {
    expect(formation('trifecta', '1-23-234').map(combinationKey)).toEqual([
      '1-2-3',
      '1-2-4',
      '1-3-2',
      '1-3-4',
    ]);
  });

  it('着順を区別しない賭式では同じ組み合わせを 1 点にまとめる', () => {
    expect(formation('trio', '12-12-3').map(combinationKey)).toEqual(['1=2=3']);
  });

  it('購入額を全点に付ける', () => {
    expect(formation('exacta', '1-23', 300).map((created) => created.stake)).toEqual([300, 300]);
  });

  it.each(['1-2', '1-2-7', '1-2-a', '1-22-3', '1--3'])('読めない表記 %s は例外', (notation) => {
    expect(() => formation('trifecta', notation)).toThrow(InvalidBetError);
  });
});

describe('box', () => {
  it('3連単ボックスは 3 艇で 6 点', () => {
    expect(box('trifecta', [1, 2, 3])).toHaveLength(6);
  });

  it('3連複ボックスは 4 艇で 4 点', () => {
    expect(box('trio', [1, 2, 3, 4]).map(combinationKey)).toEqual([
      '1=2=3',
      '1=2=4',
      '1=3=4',
      '2=3=4',
    ]);
  });
});

describe('bet', () => {
  it('同じ艇を 2 回選ぶと例外', () => {
    expect(() => bet('exacta', [1, 1])).toThrow(InvalidBetError);
  });

  it('100 円単位でない購入額は例外', () => {
    expect(() => bet('win', [1], 150)).toThrow(InvalidBetError);
    expect(() => bet('win', [1], 0)).toThrow(InvalidBetError);
  });

  it('賭式に合わない艇数や範囲外の艇番は、型でも実行時でも弾く', () => {
    // @ts-expect-error 3連単は 3 艇を選ぶ
    expect(() => bet('trifecta', [1, 2])).toThrow(InvalidBetError);
    // @ts-expect-error 艇番は 1〜6
    expect(() => bet('win', [7])).toThrow(InvalidBetError);
  });
});
