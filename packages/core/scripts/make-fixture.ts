/**
 * テスト用フィクスチャを Turnmark API の実データから切り出す。
 *
 *   pnpm --filter @funaken-lab/core fixture
 *
 * 払戻表の境界ケース（同着・特払・不成立・票なし・返還・中止）を 1 レースずつ集める。
 */
import { writeFile } from 'node:fs/promises';
import { TURNMARK_BASE_URL } from '../src/source/turnmark.ts';

const CASES = {
  normal: ['2026-08-01', 1, 12, '通常の決着（1-2-3）'],
  firstRace: ['2026-08-01', 1, 1, '1R（水面気象がその日の最終値に置き換わる）'],
  cancelled: ['2026-01-02', 17, 12, 'レース中止（全賭式の払戻が空）'],
  deadHeatThird: ['2026-01-13', 14, 11, '3着同着（3連単・3連複が 2 通り）'],
  deadHeatSecond: ['2026-05-31', 6, 7, '2着同着（2連単・2連複が 2 通り）'],
  voided: ['2026-01-01', 21, 8, 'F 4 艇で有効艇 2 艇、単勝・2連単以外が不成立'],
  special: ['2026-01-26', 5, 8, '単勝が特払、複勝に票なし'],
  refunded: ['2026-01-01', 6, 4, '1 号艇がフライングで返還'],
  unpriced: ['2026-01-05', 12, 10, '複勝に票なし'],
  unpublished: ['2026-01-08', 9, 1, '直前情報が未公開のまま中止'],
} as const;

const days = new Map<string, unknown>();

async function fetchDay(date: string): Promise<unknown> {
  const cached = days.get(date);
  if (cached !== undefined) {
    return cached;
  }
  const compact = date.replaceAll('-', '');
  const response = await fetch(`${TURNMARK_BASE_URL}/${compact.slice(0, 4)}/${compact}.json`);
  if (!response.ok) {
    throw new Error(`${date}: ${response.status}`);
  }
  const json: unknown = await response.json();
  days.set(date, json);
  return json;
}

const lines: string[] = [];
for (const [name, [date, stadium, race, note]] of Object.entries(CASES)) {
  const day = (await fetchDay(date)) as {
    programs: { stadiums: Record<string, { races: Record<string, unknown> }> };
  };
  const raw = day.programs.stadiums[String(stadium)]?.races[String(race)];
  if (raw === undefined) {
    throw new Error(`${name}: ${date} ${stadium}場 ${race}R が見つかりません`);
  }
  lines.push(`${JSON.stringify(name)}: ${JSON.stringify({ note, date, stadium, race, raw })}`);
}

const path = new URL('../test/fixtures/turnmark-races.json', import.meta.url);
await writeFile(path, `{\n${lines.join(',\n')}\n}`);
console.log(`${lines.length} レースを書き出しました: ${path.pathname}`);
