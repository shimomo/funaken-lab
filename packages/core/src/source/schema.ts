import { z } from 'zod';

/**
 * Turnmark API（https://turnmark.github.io/api/）の 1 日分の JSON。
 * 使うフィールドだけを定義し、`_source` 付きの元文字列などは読み捨てる。
 * スキーマ文書にあるとおり、どのフィールドも `null` になり得る。
 */

const nullableNumber = z.number().nullable().default(null);
const nullableString = z.string().nullable().default(null);

const rawRacer = z.object({
  entry_number: nullableNumber,
  name: nullableString,
  number: nullableNumber,
  rank_number: nullableNumber,
  branch_number: nullableNumber,
  birthplace_number: nullableNumber,
  age: nullableNumber,
  weight: nullableNumber,
  flying_count: nullableNumber,
  late_count: nullableNumber,
  average_start_timing: nullableNumber,
  national_win_rate: nullableNumber,
  national_top_2_percent: nullableNumber,
  national_top_3_percent: nullableNumber,
  local_win_rate: nullableNumber,
  local_top_2_percent: nullableNumber,
  local_top_3_percent: nullableNumber,
  motor_number: nullableNumber,
  motor_top_2_percent: nullableNumber,
  motor_top_3_percent: nullableNumber,
  boat_number: nullableNumber,
  boat_top_2_percent: nullableNumber,
  boat_top_3_percent: nullableNumber,
});

const rawWeather = {
  wind_speed: nullableNumber,
  wind_direction_number: nullableNumber,
  wave_height: nullableNumber,
  weather_number: nullableNumber,
  air_temperature: nullableNumber,
  water_temperature: nullableNumber,
};

const rawPart = z.object({
  number: nullableNumber,
  quantity: nullableNumber,
});

const rawPreviewRacer = z.object({
  entry_number: nullableNumber,
  course_number: nullableNumber,
  start_timing: nullableNumber,
  weight: nullableNumber,
  weight_adjustment: nullableNumber,
  exhibition_time: nullableNumber,
  tilt_adjustment: nullableNumber,
  propeller: nullableString,
  parts: z.array(rawPart).nullable().default(null),
});

const rawPreview = z.object({
  ...rawWeather,
  racers: z.record(z.string(), rawPreviewRacer).nullable().default(null),
});

const odds = z.number().nullable();
const oddsRange = z.object({ lower_limit: odds, upper_limit: odds });
const byBoat = <T extends z.ZodType>(value: T) => z.record(z.string(), value);

const rawOdds = z.object({
  trifecta: byBoat(byBoat(byBoat(odds)))
    .nullable()
    .default(null),
  trio: byBoat(byBoat(byBoat(odds)))
    .nullable()
    .default(null),
  exacta: byBoat(byBoat(odds)).nullable().default(null),
  quinella: byBoat(byBoat(odds)).nullable().default(null),
  quinella_place: byBoat(byBoat(oddsRange)).nullable().default(null),
  win: byBoat(odds).nullable().default(null),
  place: byBoat(oddsRange).nullable().default(null),
});

const rawResultRacer = z.object({
  entry_number: nullableNumber,
  course_number: nullableNumber,
  start_timing: nullableNumber,
  place_number: nullableNumber,
  number: nullableNumber,
  name: nullableString,
});

const rawPayout = z.object({
  combination: nullableString,
  amount: nullableNumber,
  label: nullableString,
});

const payoutList = z.array(rawPayout).default([]);

const rawResult = z.object({
  ...rawWeather,
  technique_number: nullableNumber,
  refunds: z.array(z.number()).nullable().default(null),
  racers: z.record(z.string(), rawResultRacer).nullable().default(null),
  payouts: z
    .object({
      trifecta: payoutList,
      trio: payoutList,
      exacta: payoutList,
      quinella: payoutList,
      quinella_place: payoutList,
      win: payoutList,
      place: payoutList,
    })
    .nullable()
    .default(null),
});

const rawRace = z.object({
  date: z.string(),
  closed_at: nullableString,
  grade_number: nullableNumber,
  title: nullableString,
  subtitle: nullableString,
  distance: nullableNumber,
  day_number: nullableNumber,
  racers: z.record(z.string(), rawRacer).nullable().default(null),
  preview: rawPreview.nullable().default(null),
  odds: rawOdds.nullable().default(null),
  result: rawResult.nullable().default(null),
});

export const rawDay = z.object({
  programs: z.object({
    stadiums: z.record(
      z.string(),
      z.object({
        races: z.record(z.string(), rawRace),
      }),
    ),
  }),
});

export type RawDay = z.infer<typeof rawDay>;
export type RawRace = z.infer<typeof rawRace>;
export type RawPreview = z.infer<typeof rawPreview>;
export type RawOdds = z.infer<typeof rawOdds>;
export type RawResult = z.infer<typeof rawResult>;
export type RawPayout = z.infer<typeof rawPayout>;
