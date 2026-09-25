import { readFileSync } from 'node:fs';
import type { Race } from '../src/domain/race.ts';
import { parseTurnmarkDay } from '../src/source/normalize.ts';

interface FixtureCase {
  readonly note: string;
  readonly date: string;
  readonly stadium: number;
  readonly race: number;
  readonly raw: unknown;
}

export type FixtureName =
  | 'normal'
  | 'firstRace'
  | 'cancelled'
  | 'deadHeatThird'
  | 'deadHeatSecond'
  | 'voided'
  | 'special'
  | 'refunded'
  | 'unpriced'
  | 'unpublished';

const cases = JSON.parse(
  readFileSync(new URL('./fixtures/turnmark-races.json', import.meta.url), 'utf8'),
) as Record<FixtureName, FixtureCase>;

export const FIXTURE_NAMES = Object.keys(cases) as FixtureName[];

/** フィクスチャのレースを Turnmark API の 1 日分と同じ形に包む。 */
export function rawDayOf(...names: readonly FixtureName[]): unknown {
  const stadiums: Record<string, { races: Record<string, unknown> }> = {};
  for (const name of names) {
    const { stadium, race, raw } = cases[name];
    stadiums[stadium] ??= { races: {} };
    stadiums[stadium].races[race] = raw;
  }
  return { programs: { stadiums } };
}

export function raceOf(name: FixtureName): Race {
  const [race] = parseTurnmarkDay(rawDayOf(name));
  if (race === undefined) {
    throw new Error(`フィクスチャ ${name} を読めませんでした`);
  }
  return race;
}

export function allRaces(): Race[] {
  return parseTurnmarkDay(rawDayOf(...FIXTURE_NAMES));
}
