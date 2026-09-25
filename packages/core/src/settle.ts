import { type Bet, combinationKey } from './domain/bet.ts';
import type { Result } from './domain/race.ts';

/**
 * 1 点の舟券の決着。回収率の母数に入るのは `hit` / `miss` / `special` だけ。
 *
 * - `hit`: 的中
 * - `miss`: 不的中
 * - `special`: 特払。賭式は成立したので母数に入れ、払戻は 100 円あたり 70 円
 * - `refund`: 返還艇を含む舟券。全額返るので母数から外す
 * - `void`: 賭式の不成立、またはレースの中止。全額返るので母数から外す
 * - `unpriced`: 票なし。的中の組番に票が無く払戻が定義されないので、その賭式ごと母数から外す
 * - `pending`: 結果がまだ無い
 */
export type Outcome = 'hit' | 'miss' | 'special' | 'refund' | 'void' | 'unpriced' | 'pending';

export const OUTCOMES = [
  'hit',
  'miss',
  'special',
  'refund',
  'void',
  'unpriced',
  'pending',
] as const satisfies readonly Outcome[];

export const OUTCOME_LABELS = {
  hit: '的中',
  miss: '不的中',
  special: '特払',
  refund: '返還',
  void: '不成立・中止',
  unpriced: '票なし',
  pending: '未確定',
} as const satisfies Record<Outcome, string>;

export interface Settlement {
  readonly outcome: Outcome;
  /** 実際に戻ってくる金額（円）。返還・不成立は購入額そのもの。 */
  readonly payout: number;
}

export function isCounted(outcome: Outcome): boolean {
  return outcome === 'hit' || outcome === 'miss' || outcome === 'special';
}

/** 払戻は確定オッズではなく払戻表から計算する（返還があるとオッズと払戻が食い違うため）。 */
export function settle(target: Bet, result: Result | null): Settlement {
  if (result === null) {
    return { outcome: 'pending', payout: 0 };
  }
  if (result.cancelled) {
    return { outcome: 'void', payout: target.stake };
  }
  if (target.boats.some((boat) => result.refunds.includes(boat))) {
    return { outcome: 'refund', payout: target.stake };
  }
  const rows = result.payouts[target.type];
  if (rows.length === 0) {
    return { outcome: 'pending', payout: 0 };
  }
  if (rows.some((row) => row.kind === 'void')) {
    return { outcome: 'void', payout: target.stake };
  }
  if (rows.some((row) => row.kind === 'unpriced')) {
    return { outcome: 'unpriced', payout: 0 };
  }
  for (const row of rows) {
    if (row.kind === 'special') {
      return { outcome: 'special', payout: (row.amount * target.stake) / 100 };
    }
  }
  const key = combinationKey(target);
  for (const row of rows) {
    if (row.kind === 'paid' && row.combination === key) {
      return { outcome: 'hit', payout: (row.amount * target.stake) / 100 };
    }
  }
  return { outcome: 'miss', payout: 0 };
}
