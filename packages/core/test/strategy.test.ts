import { describe, expect, expectTypeOf, it } from 'vitest';
import { bet } from '../src/domain/bet.ts';
import type { PreRace, PreRaceWithFinalOdds } from '../src/domain/race.ts';
import { boat1Win, favoriteWinWithFinalOdds } from '../src/presets.ts';
import { decide, defineStrategy, toPreRace } from '../src/strategy.ts';
import { raceOf } from './fixtures.ts';

describe('toPreRace', () => {
  it('結果と確定オッズを実体から取り除く', () => {
    const view = toPreRace(raceOf('normal'));
    expect(Object.keys(view).sort()).toEqual(['card', 'key', 'preview']);
  });

  it('結果と確定オッズは型の上でも読めない', () => {
    const view = toPreRace(raceOf('normal'));
    // @ts-expect-error 締切前のビューに結果は無い
    expect(view.result).toBeUndefined();
    // @ts-expect-error 締切前のビューに確定オッズは無い
    expect(view.finalOdds).toBeUndefined();
  });

  it('1R の水面気象は隠す（後から取った値はその日の最終計測値のため）', () => {
    const race = raceOf('firstRace');
    expect(race.preview?.weather).not.toBeNull();
    expect(toPreRace(race).preview?.weather).toBeNull();
    expect(toPreRace(race).preview?.entries).toHaveLength(6);
  });

  it('2R 以降の水面気象はそのまま渡す', () => {
    expect(toPreRace(raceOf('normal')).preview?.weather).toMatchObject({ windSpeed: 2 });
  });
});

describe('decide', () => {
  it('確定オッズは lookahead が finalOdds の戦略にだけ渡す', () => {
    const seen: string[][] = [];
    const record = (view: object) => {
      seen.push(Object.keys(view).sort());
      return [bet('win', [1])];
    };
    decide(
      defineStrategy({ id: 'a', name: 'a', description: '', lookahead: 'none', decide: record }),
      raceOf('normal'),
    );
    decide(
      defineStrategy({
        id: 'b',
        name: 'b',
        description: '',
        lookahead: 'finalOdds',
        decide: record,
      }),
      raceOf('normal'),
    );
    expect(seen).toEqual([
      ['card', 'key', 'preview'],
      ['card', 'finalOdds', 'key', 'preview'],
    ]);
  });

  it('lookahead から戦略が受け取るビューの型が決まる', () => {
    expectTypeOf(boat1Win.decide).parameter(0).toEqualTypeOf<PreRace>();
    expectTypeOf(favoriteWinWithFinalOdds.decide)
      .parameter(0)
      .toEqualTypeOf<PreRaceWithFinalOdds>();
  });
});
