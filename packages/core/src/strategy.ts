import type { Bet } from './domain/bet.ts';
import type { PreRace, PreRaceWithFinalOdds, Preview, Race } from './domain/race.ts';

/**
 * 締切後に確定する情報を、戦略がどこまで覗くか。
 *
 * - `none`: 締切前に見えている情報だけ（出走表と直前情報）
 * - `finalOdds`: 確定オッズも使う。締切前には見えない値なので、検証結果は「リークあり」になる
 */
export type Lookahead = 'none' | 'finalOdds';

export type RaceView<L extends Lookahead> = L extends 'finalOdds' ? PreRaceWithFinalOdds : PreRace;

export interface Strategy<L extends Lookahead = 'none'> {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly lookahead: L;
  /** 1 レースぶんの買い目を返す。買わないレースは空配列。 */
  readonly decide: (race: RaceView<L>) => readonly Bet[];
}

export type AnyStrategy = { [L in Lookahead]: Strategy<L> }[Lookahead];

/** `lookahead` からビューの型を推論させるための恒等関数。 */
export function defineStrategy<L extends Lookahead>(strategy: Strategy<L>): Strategy<L> {
  return strategy;
}

/** 締切前のビューを作る。結果と確定オッズは実体からも取り除く。 */
export function toPreRace(race: Race): PreRace {
  return { key: race.key, card: race.card, preview: guardPreview(race) };
}

export function toPreRaceWithFinalOdds(race: Race): PreRaceWithFinalOdds {
  return { ...toPreRace(race), finalOdds: race.finalOdds };
}

/** 戦略の `lookahead` に合ったビューを渡して買い目を得る。 */
export function decide(strategy: AnyStrategy, race: Race): readonly Bet[] {
  return strategy.lookahead === 'finalOdds'
    ? strategy.decide(toPreRaceWithFinalOdds(race))
    : strategy.decide(toPreRace(race));
}

function guardPreview(race: Race): Preview | null {
  if (race.preview === null || race.key.race !== 1) {
    return race.preview;
  }
  // 1R の水面気象は、後から取ると「その日の最後の計測値」に置き換わっている
  return { ...race.preview, weather: null };
}
