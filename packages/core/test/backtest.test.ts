import { describe, expect, it } from 'vitest';
import { runBacktest, StrategyError } from '../src/backtest.ts';
import type { Bet } from '../src/domain/bet.ts';
import { boat1Win, favoriteWinWithFinalOdds } from '../src/presets.ts';
import { defineStrategy } from '../src/strategy.ts';
import { allRaces } from './fixtures.ts';

describe('runBacktest', () => {
  // フィクスチャ 10 レースで 1 号艇の単勝を買うと、
  // 的中 3（110・260・140 円）、不的中 3、特払 1（70 円）、返還 1、中止 2 になる
  const report = runBacktest(allRaces(), boat1Win);

  it('決着ごとに点数を数え、返還・不成立・中止は母数から外す', () => {
    expect(report.tickets).toEqual({
      hit: 3,
      miss: 3,
      special: 1,
      refund: 1,
      void: 2,
      unpriced: 0,
      pending: 0,
    });
    expect(report.total).toEqual({ bets: 7, hits: 3, stake: 700, payout: 580, roi: 580 / 700 });
    expect(report.races).toEqual({ total: 10, bought: 10, counted: 7, hit: 3 });
    expect(report.hitRate).toBe(3 / 7);
  });

  it('締切順に積み上げた損益の最大下落幅を出す', () => {
    // -100, -200, -300, -330（特払）, -290, -130, -120 と推移する
    expect(report.maxDrawdown).toBe(330);
    expect(report.period).toEqual({ from: '2026-01-01', to: '2026-08-01' });
  });

  it('場ごとに集計する', () => {
    expect(report.byStadium.find((stadium) => stadium.stadium === 1)).toMatchObject({
      name: '桐生',
      bets: 2,
      hits: 2,
      stake: 200,
      payout: 370,
    });
  });

  it('回収率の信頼区間は同じ seed なら同じ値になる', () => {
    const again = runBacktest(allRaces(), boat1Win);
    expect(again.roiInterval).toEqual(report.roiInterval);
    expect(report.roiInterval?.lower).toBeLessThanOrEqual(report.total.roi ?? Number.NaN);
    expect(report.roiInterval?.upper).toBeGreaterThanOrEqual(report.total.roi ?? Number.NaN);
  });

  it('確定オッズを使う戦略はリークありとして印を付ける', () => {
    expect(report.leaky).toBe(false);
    expect(runBacktest(allRaces(), favoriteWinWithFinalOdds, { bootstrap: null }).leaky).toBe(true);
  });

  it('不正な買い目を返した戦略はレースの場所つきで止める', () => {
    const broken = defineStrategy({
      id: 'broken',
      name: 'broken',
      description: '',
      lookahead: 'none',
      decide: () => [{ type: 'win', boats: [7], stake: 100 } as unknown as Bet],
    });
    expect(() => runBacktest(allRaces(), broken)).toThrow(StrategyError);
    expect(() => runBacktest(allRaces(), broken)).toThrow(/2026-01-01 浜名湖 4R: 買い目が不正です/);
  });
});
