import { describe, expect, it } from 'vitest';
import { parseTurnmarkDay } from '../src/source/normalize.ts';
import { allRaces, raceOf } from './fixtures.ts';

describe('parseTurnmarkDay', () => {
  it('出走表・直前情報・確定オッズ・結果を読む', () => {
    const race = raceOf('normal');

    expect(race.key).toEqual({ date: '2026-08-01', stadium: 1, race: 12 });
    expect(race.card).toMatchObject({
      closedAt: '2026-08-01 20:30:00',
      grade: 'G3',
      distance: 1800,
    });
    expect(race.card.entries).toHaveLength(6);
    expect(race.card.entries[0]).toMatchObject({
      boat: 1,
      racerNumber: 4885,
      rank: 'A2',
      nationalWinRate: 6.98,
      motor: { number: 71, top2Rate: 28.99 },
    });
    expect(race.preview?.entries[0]).toMatchObject({ boat: 1, course: 1, exhibitionTime: 6.6 });
    expect(race.finalOdds?.win['1']).toBe(1.1);
    expect(race.finalOdds?.trifecta['1-2-3']).toBe(12.4);
    expect(race.finalOdds?.trio['1=2=3']).toBe(4.7);
    expect(race.finalOdds?.place['1']).toEqual({ lower: 1, upper: 1.1 });
    expect(race.result?.technique).toBe('逃げ');
    expect(race.result?.payouts.trifecta).toEqual([
      { kind: 'paid', combination: '1-2-3', amount: 1240 },
    ]);
  });

  it('組番が null の払戻行は、元返しなら不成立、それ以外は特払として読む', () => {
    expect(raceOf('voided').result?.payouts.trifecta).toEqual([
      { kind: 'void', amount: 100, label: '不成立' },
    ]);
    expect(raceOf('special').result?.payouts.win).toEqual([
      { kind: 'special', amount: 70, label: '特払' },
    ]);
  });

  it('金額が null の払戻行は票なしとして読む', () => {
    expect(raceOf('unpriced').result?.payouts.place).toContainEqual({
      kind: 'unpriced',
      combination: '6',
    });
  });

  it('同着は 1 つの賭式に複数の行を持つ', () => {
    expect(raceOf('deadHeatThird').result?.payouts.trifecta).toHaveLength(2);
  });

  it('返還艇と、失格・欠場の区分を読む', () => {
    const result = raceOf('voided').result;
    expect(result?.refunds).toEqual([2, 3, 5, 6]);
    expect(result?.entries[1]).toMatchObject({ boat: 2, place: null, status: 'フライング欠場' });
    expect(result?.entries[3]).toMatchObject({ boat: 4, place: 1, status: null });
  });

  it('全賭式の払戻が空のレースは中止とみなす', () => {
    expect(raceOf('cancelled').result?.cancelled).toBe(true);
    expect(raceOf('normal').result?.cancelled).toBe(false);
  });

  it('展示タイムが 1 艇も入っていない直前情報は未公開とみなす', () => {
    expect(raceOf('unpublished').preview).toBeNull();
  });

  it('締切順に並べる', () => {
    const keys = allRaces().map((race) => `${race.key.date} ${race.card.closedAt}`);
    expect(keys).toEqual([...keys].sort());
  });

  it('形の合わない JSON は例外', () => {
    expect(() => parseTurnmarkDay({ programs: {} })).toThrow();
  });
});
