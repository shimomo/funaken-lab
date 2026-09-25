import { bet, formation } from './domain/bet.ts';
import { type BoatNumber, isBoatNumber } from './domain/boat.ts';
import { type AnyStrategy, defineStrategy } from './strategy.ts';

/**
 * 動作確認用の素朴な戦略。どれも「よく知られた買い方」の基準線で、
 * ここで検証した結果が狙い目という意味ではない。
 */

export const boat1Win = defineStrategy({
  id: 'boat1-win',
  name: '1号艇の単勝',
  description: '全レースで 1 号艇の単勝を 100 円ずつ買う。',
  lookahead: 'none',
  decide: () => [bet('win', [1])],
});

export const boat1Trifecta = defineStrategy({
  id: 'boat1-trifecta',
  name: '1号艇頭の3連単 1-23-234',
  description: '1 号艇を 1 着に固定し、2 着に 2・3 号艇、3 着に 2〜4 号艇を流す（4 点）。',
  lookahead: 'none',
  decide: () => formation('trifecta', '1-23-234'),
});

export const topWinRateWin = defineStrategy({
  id: 'top-win-rate-win',
  name: '全国勝率トップの単勝',
  description: '出走表の全国勝率がいちばん高い艇の単勝を買う（同率は内枠）。',
  lookahead: 'none',
  decide: (race) => {
    const top = best(race.card.entries, (entry) => entry.nationalWinRate, 'max');
    return top === null ? [] : [bet('win', [top])];
  },
});

export const fastestExhibitionWin = defineStrategy({
  id: 'fastest-exhibition-win',
  name: '展示タイム1位の単勝',
  description: '直前情報の展示タイムがいちばん速い艇の単勝を買う。直前情報が無いレースは見送る。',
  lookahead: 'none',
  decide: (race) => {
    const fastest = best(race.preview?.entries ?? [], (entry) => entry.exhibitionTime, 'min');
    return fastest === null ? [] : [bet('win', [fastest])];
  },
});

export const favoriteWinWithFinalOdds = defineStrategy({
  id: 'favorite-win-final-odds',
  name: '確定オッズ1番人気の単勝（リークあり）',
  description:
    '確定オッズで単勝 1 番人気の艇を買う。確定オッズは締切後に決まる値なので、この検証は実際には再現できない。',
  lookahead: 'finalOdds',
  decide: (race) => {
    const entries = Object.entries(race.finalOdds?.win ?? {}).flatMap(([key, value]) => {
      const boat = Number(key);
      return isBoatNumber(boat) ? [{ boat, value }] : [];
    });
    // 1 票も入っていない組番のオッズは 0 になる（特払のレースなど）ので候補から外す
    const favorite = best(
      entries,
      (entry) => (entry.value !== null && entry.value > 0 ? entry.value : null),
      'min',
    );
    return favorite === null ? [] : [bet('win', [favorite])];
  },
});

export const PRESET_STRATEGIES: readonly AnyStrategy[] = [
  boat1Win,
  boat1Trifecta,
  topWinRateWin,
  fastestExhibitionWin,
  favoriteWinWithFinalOdds,
];

/** 指標がいちばん良い艇。同点は内枠を優先し、値の無い艇は候補から外す。 */
function best<T extends { readonly boat: BoatNumber }>(
  items: readonly T[],
  metric: (item: T) => number | null,
  direction: 'min' | 'max',
): BoatNumber | null {
  let winner: { readonly boat: BoatNumber; readonly value: number } | null = null;
  for (const item of items) {
    const value = metric(item);
    if (value === null) {
      continue;
    }
    const better =
      direction === 'max'
        ? value > (winner?.value ?? -Infinity)
        : value < (winner?.value ?? Infinity);
    if (winner === null || better || (value === winner.value && item.boat < winner.boat)) {
      winner = { boat: item.boat, value };
    }
  }
  return winner?.boat ?? null;
}
