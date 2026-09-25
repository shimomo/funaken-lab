import { describe, expect, it } from 'vitest';
import { bet } from '../src/domain/bet.ts';
import { isCounted, OUTCOMES, settle } from '../src/settle.ts';
import { raceOf } from './fixtures.ts';

describe('settle', () => {
  it('的中は払戻表の金額を購入額に比例させて払う', () => {
    const { result } = raceOf('normal');
    expect(settle(bet('trifecta', [1, 2, 3]), result)).toEqual({ outcome: 'hit', payout: 1240 });
    expect(settle(bet('trifecta', [1, 2, 3], 300), result)).toEqual({
      outcome: 'hit',
      payout: 3720,
    });
    expect(settle(bet('trio', [3, 1, 2]), result)).toEqual({ outcome: 'hit', payout: 470 });
    expect(settle(bet('place', [2]), result)).toEqual({ outcome: 'hit', payout: 300 });
    expect(settle(bet('quinellaPlace', [3, 2]), result)).toEqual({ outcome: 'hit', payout: 270 });
  });

  it('不的中は払戻なし', () => {
    expect(settle(bet('trifecta', [1, 3, 2]), raceOf('normal').result)).toEqual({
      outcome: 'miss',
      payout: 0,
    });
  });

  it('同着はどちらの組番も的中', () => {
    const { result } = raceOf('deadHeatThird');
    expect(settle(bet('trifecta', [6, 4, 1]), result)).toEqual({ outcome: 'hit', payout: 66730 });
    expect(settle(bet('trifecta', [6, 4, 3]), result)).toEqual({ outcome: 'hit', payout: 66230 });
    expect(settle(bet('trifecta', [6, 4, 2]), result).outcome).toBe('miss');
    expect(settle(bet('exacta', [1, 4]), raceOf('deadHeatSecond').result)).toEqual({
      outcome: 'hit',
      payout: 220,
    });
  });

  it('返還艇を含む舟券は返還、含まない舟券は成立した賭式どおりに決済する', () => {
    const { result } = raceOf('voided');
    expect(settle(bet('trifecta', [4, 1, 2]), result)).toEqual({ outcome: 'refund', payout: 100 });
    expect(settle(bet('exacta', [4, 1]), result)).toEqual({ outcome: 'hit', payout: 200 });
    expect(settle(bet('exacta', [1, 4]), result).outcome).toBe('miss');
    expect(settle(bet('win', [4]), result)).toEqual({ outcome: 'hit', payout: 520 });
  });

  it('不成立の賭式は全額返る', () => {
    const { result } = raceOf('voided');
    expect(settle(bet('quinella', [1, 4]), result)).toEqual({ outcome: 'void', payout: 100 });
    expect(settle(bet('place', [1], 200), result)).toEqual({ outcome: 'void', payout: 200 });
  });

  it('特払は 100 円あたり 70 円', () => {
    expect(settle(bet('win', [1], 200), raceOf('special').result)).toEqual({
      outcome: 'special',
      payout: 140,
    });
  });

  it('票なしの行がある賭式は、その賭式ごと母数から外す', () => {
    expect(settle(bet('place', [1]), raceOf('special').result).outcome).toBe('unpriced');
    expect(settle(bet('place', [4]), raceOf('unpriced').result).outcome).toBe('unpriced');
  });

  it('中止のレースは全額返る', () => {
    expect(settle(bet('win', [1]), raceOf('cancelled').result)).toEqual({
      outcome: 'void',
      payout: 100,
    });
  });

  it('結果が無ければ未確定', () => {
    expect(settle(bet('win', [1]), null)).toEqual({ outcome: 'pending', payout: 0 });
  });
});

describe('isCounted', () => {
  it('回収率の母数に入るのは的中・不的中・特払だけ', () => {
    expect(OUTCOMES.filter(isCounted)).toEqual(['hit', 'miss', 'special']);
  });
});
