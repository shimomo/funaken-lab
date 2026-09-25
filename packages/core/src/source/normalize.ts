import type { BetType } from '../domain/bet.ts';
import { type BoatNumber, isBoatNumber } from '../domain/boat.ts';
import {
  FINISH_STATUSES,
  GRADES,
  lookup,
  PARTS,
  RANKS,
  TECHNIQUES,
  WEATHER_CONDITIONS,
} from '../domain/codes.ts';
import {
  compareRaces,
  type Entry,
  type FinalOdds,
  type OddsRange,
  type OddsTable,
  type PayoutRow,
  type Preview,
  type PreviewEntry,
  type Race,
  type RaceCard,
  type Result,
  type ResultEntry,
  type Weather,
} from '../domain/race.ts';
import { isStadiumNumber } from '../domain/stadium.ts';
import {
  type RawDay,
  type RawOdds,
  type RawPayout,
  type RawPreview,
  type RawRace,
  type RawResult,
  rawDay,
} from './schema.ts';

/** Turnmark API の 1 日分の JSON を検証し、レースの配列（締切順）に変換する。 */
export function parseTurnmarkDay(json: unknown): Race[] {
  return normalizeDay(rawDay.parse(json));
}

export function normalizeDay(day: RawDay): Race[] {
  const races: Race[] = [];
  for (const [stadiumKey, stadium] of Object.entries(day.programs.stadiums)) {
    const stadiumNumber = Number(stadiumKey);
    if (!isStadiumNumber(stadiumNumber)) {
      continue;
    }
    for (const [raceKey, raw] of Object.entries(stadium.races)) {
      races.push({
        key: { date: raw.date, stadium: stadiumNumber, race: Number(raceKey) },
        card: normalizeCard(raw),
        preview: normalizePreview(raw.preview),
        finalOdds: normalizeOdds(raw.odds),
        result: normalizeResult(raw.result),
      });
    }
  }
  return races.sort(compareRaces);
}

function normalizeCard(raw: RawRace): RaceCard {
  const entries = byBoat(
    raw.racers,
    (boat, racer): Entry => ({
      boat,
      racerNumber: racer.number,
      name: racer.name,
      rank: lookup(RANKS, racer.rank_number),
      branch: racer.branch_number,
      birthplace: racer.birthplace_number,
      age: racer.age,
      weight: racer.weight,
      flyingCount: racer.flying_count,
      lateCount: racer.late_count,
      averageStartTiming: racer.average_start_timing,
      nationalWinRate: racer.national_win_rate,
      nationalTop2Rate: racer.national_top_2_percent,
      nationalTop3Rate: racer.national_top_3_percent,
      localWinRate: racer.local_win_rate,
      localTop2Rate: racer.local_top_2_percent,
      localTop3Rate: racer.local_top_3_percent,
      motor: {
        number: racer.motor_number,
        top2Rate: racer.motor_top_2_percent,
        top3Rate: racer.motor_top_3_percent,
      },
      hull: {
        number: racer.boat_number,
        top2Rate: racer.boat_top_2_percent,
        top3Rate: racer.boat_top_3_percent,
      },
    }),
  );
  return {
    closedAt: raw.closed_at,
    grade: lookup(GRADES, raw.grade_number),
    title: raw.title,
    subtitle: raw.subtitle,
    distance: raw.distance,
    day: raw.day_number,
    entries,
  };
}

function normalizeWeather(raw: RawPreview | RawResult): Weather {
  return {
    condition: lookup(WEATHER_CONDITIONS, raw.weather_number),
    windSpeed: raw.wind_speed,
    windDirection: raw.wind_direction_number,
    waveHeight: raw.wave_height,
    airTemperature: raw.air_temperature,
    waterTemperature: raw.water_temperature,
  };
}

function normalizePreview(raw: RawPreview | null): Preview | null {
  if (raw === null) {
    return null;
  }
  const entries = byBoat(
    raw.racers,
    (boat, racer): PreviewEntry => ({
      boat,
      course: racer.course_number,
      startTiming: racer.start_timing,
      weight: racer.weight,
      weightAdjustment: racer.weight_adjustment,
      exhibitionTime: racer.exhibition_time,
      tilt: racer.tilt_adjustment,
      newPropeller: racer.propeller !== null,
      parts: (racer.parts ?? []).map((part) => ({
        part: lookup(PARTS, part.number),
        quantity: part.quantity,
      })),
    }),
  );
  // 直前情報は「未公開」という形を持たず、公開前も枠だけ空で返る。展示タイムの有無で判定する
  if (!entries.some((entry) => entry.exhibitionTime !== null)) {
    return null;
  }
  return { weather: normalizeWeather(raw), entries };
}

function normalizeOdds(raw: RawOdds | null): FinalOdds | null {
  if (raw === null) {
    return null;
  }
  return {
    trifecta: flatten(raw.trifecta, '-', toOdds),
    trio: flatten(raw.trio, '=', toOdds),
    exacta: flatten(raw.exacta, '-', toOdds),
    quinella: flatten(raw.quinella, '=', toOdds),
    quinellaPlace: flatten(raw.quinella_place, '=', toRange),
    win: flatten(raw.win, '-', toOdds),
    place: flatten(raw.place, '-', toRange),
  };
}

function normalizeResult(raw: RawResult | null): Result | null {
  if (raw === null || raw.payouts === null) {
    return null;
  }
  const payouts: Record<BetType, readonly PayoutRow[]> = {
    trifecta: raw.payouts.trifecta.flatMap((row) => toPayoutRow(row, true)),
    trio: raw.payouts.trio.flatMap((row) => toPayoutRow(row, false)),
    exacta: raw.payouts.exacta.flatMap((row) => toPayoutRow(row, true)),
    quinella: raw.payouts.quinella.flatMap((row) => toPayoutRow(row, false)),
    quinellaPlace: raw.payouts.quinella_place.flatMap((row) => toPayoutRow(row, false)),
    win: raw.payouts.win.flatMap((row) => toPayoutRow(row, true)),
    place: raw.payouts.place.flatMap((row) => toPayoutRow(row, true)),
  };
  const entries = byBoat(raw.racers, (boat, racer): ResultEntry => {
    const placeNumber = racer.place_number;
    const finished = placeNumber !== null && placeNumber >= 1 && placeNumber <= 6;
    return {
      boat,
      course: racer.course_number,
      startTiming: racer.start_timing,
      place: finished ? placeNumber : null,
      status: finished ? null : lookup(FINISH_STATUSES, placeNumber),
      racerNumber: racer.number,
      name: racer.name,
    };
  });
  return {
    cancelled: Object.values(payouts).every((rows) => rows.length === 0),
    entries,
    technique: lookup(TECHNIQUES, raw.technique_number),
    refunds: (raw.refunds ?? []).filter(isBoatNumber),
    payouts,
    weather: normalizeWeather(raw),
  };
}

/**
 * 払戻表の行を 4 通りに分ける。組番が `null` の行は、元返し（100 円）なら不成立、
 * それ以外なら特払。ラベルの文言は公式サイトの表記そのままなので判定には使わない。
 */
function toPayoutRow(raw: RawPayout, ordered: boolean): PayoutRow[] {
  if (raw.combination !== null) {
    const combination = normalizeCombination(raw.combination, ordered);
    return [
      raw.amount === null
        ? { kind: 'unpriced', combination }
        : { kind: 'paid', combination, amount: raw.amount },
    ];
  }
  if (raw.amount === null) {
    return [];
  }
  return [
    raw.amount === 100
      ? { kind: 'void', amount: raw.amount, label: raw.label }
      : { kind: 'special', amount: raw.amount, label: raw.label },
  ];
}

function normalizeCombination(combination: string, ordered: boolean): string {
  const boats = combination.split(/[-=]/).map(Number);
  return ordered ? boats.join('-') : boats.sort((a, b) => a - b).join('=');
}

function byBoat<Raw, Out>(
  record: Readonly<Record<string, Raw>> | null,
  map: (boat: BoatNumber, raw: Raw) => Out,
): Out[] {
  return Object.entries(record ?? {})
    .map(([key, raw]) => [Number(key), raw] as const)
    .filter((pair): pair is readonly [BoatNumber, Raw] => isBoatNumber(pair[0]))
    .sort(([a], [b]) => a - b)
    .map(([boat, raw]) => map(boat, raw));
}

type Nested<V> = { readonly [key: string]: V | Nested<V> };

/** `{"1": {"2": {"3": 12.4}}}` を `{"1-2-3": 12.4}` のように組番表記へ平らにする。 */
function flatten<V, Out>(
  nested: Nested<V> | null,
  separator: '-' | '=',
  convert: (value: V) => Out | null,
): OddsTable<Out> {
  const table: Record<string, Out | null> = {};
  const walk = (node: Nested<V>, path: readonly string[]): void => {
    for (const [key, value] of Object.entries(node)) {
      if (isNested(value)) {
        walk(value, [...path, key]);
      } else {
        table[[...path, key].join(separator)] = convert(value);
      }
    }
  };
  if (nested !== null) {
    walk(nested, []);
  }
  return table;
}

function isNested<V>(value: V | Nested<V>): value is Nested<V> {
  // 拡連複・複勝のオッズ `{lower_limit, upper_limit}` は葉として扱う
  return typeof value === 'object' && value !== null && !('lower_limit' in value);
}

function toOdds(value: number | null): number | null {
  return value;
}

function toRange(
  value: { readonly lower_limit: number | null; readonly upper_limit: number | null } | null,
): OddsRange | null {
  if (value === null || value.lower_limit === null || value.upper_limit === null) {
    return null;
  }
  return { lower: value.lower_limit, upper: value.upper_limit };
}
