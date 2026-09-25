import type { BetType } from './bet.ts';
import type { BoatNumber } from './boat.ts';
import type { FinishStatus, Grade, Part, Rank, Technique, WeatherCondition } from './codes.ts';
import type { StadiumNumber } from './stadium.ts';

export interface RaceKey {
  /** 開催日（`YYYY-MM-DD`、日本時間）。 */
  readonly date: string;
  readonly stadium: StadiumNumber;
  /** レース番号（1〜12）。 */
  readonly race: number;
}

export interface Rates {
  readonly number: number | null;
  /** 2 連対率（%）。 */
  readonly top2Rate: number | null;
  /** 3 連対率（%）。 */
  readonly top3Rate: number | null;
}

/** 出走表の 1 艇ぶん。前日までに公開される。 */
export interface Entry {
  readonly boat: BoatNumber;
  /** 選手登録番号。 */
  readonly racerNumber: number | null;
  readonly name: string | null;
  readonly rank: Rank | null;
  /** 支部（都道府県番号）。 */
  readonly branch: number | null;
  /** 出身地（都道府県番号）。 */
  readonly birthplace: number | null;
  readonly age: number | null;
  /** 体重（kg）。 */
  readonly weight: number | null;
  readonly flyingCount: number | null;
  readonly lateCount: number | null;
  /** 平均スタートタイミング（秒）。 */
  readonly averageStartTiming: number | null;
  readonly nationalWinRate: number | null;
  readonly nationalTop2Rate: number | null;
  readonly nationalTop3Rate: number | null;
  readonly localWinRate: number | null;
  readonly localTop2Rate: number | null;
  readonly localTop3Rate: number | null;
  readonly motor: Rates;
  /** ボート（艇体）の番号と連対率。枠番（`boat`）とは別物。 */
  readonly hull: Rates;
}

export interface RaceCard {
  /** 締切日時（`YYYY-MM-DD HH:MM:SS`、日本時間）。 */
  readonly closedAt: string | null;
  readonly grade: Grade | null;
  readonly title: string | null;
  readonly subtitle: string | null;
  /** 距離（m）。 */
  readonly distance: number | null;
  /** 開催何日目か。 */
  readonly day: number | null;
  readonly entries: readonly Entry[];
}

export interface Weather {
  readonly condition: WeatherCondition | null;
  /** 風速（m）。 */
  readonly windSpeed: number | null;
  /**
   * 風向番号。16 方位の名前（1 = 北 … 16 = 北北西）で、17 は無風。
   * 公式サイトの仕様どおり、スタートラインを基準にした向きで、絶対方位ではない。
   */
  readonly windDirection: number | null;
  /** 波高（cm）。 */
  readonly waveHeight: number | null;
  /** 気温（℃）。 */
  readonly airTemperature: number | null;
  /** 水温（℃）。 */
  readonly waterTemperature: number | null;
}

export interface PartExchange {
  readonly part: Part | null;
  /** 交換個数。公式サイトが個数を書かない部品は `null`（1 個という意味ではない）。 */
  readonly quantity: number | null;
}

/** 直前情報の 1 艇ぶん。 */
export interface PreviewEntry {
  readonly boat: BoatNumber;
  /** スタート展示の進入コース。 */
  readonly course: number | null;
  /** スタート展示のスタートタイミング（秒）。フライングは負の値。 */
  readonly startTiming: number | null;
  readonly weight: number | null;
  /** 体重調整量（kg）。 */
  readonly weightAdjustment: number | null;
  /** 展示タイム（秒）。 */
  readonly exhibitionTime: number | null;
  readonly tilt: number | null;
  /** プロペラを交換したか（公式サイトの「新」）。 */
  readonly newPropeller: boolean;
  readonly parts: readonly PartExchange[];
}

export interface Preview {
  /**
   * 水面気象。1R の値は取得時点で「その日の最後の計測値」に置き換わっているので、
   * 締切前のビュー（`PreRace`）では `null` にしてある。
   */
  readonly weather: Weather | null;
  readonly entries: readonly PreviewEntry[];
}

export interface OddsRange {
  readonly lower: number;
  readonly upper: number;
}

/** 組番（`combinationKey` の表記）ごとのオッズ。欠場艇を含む組番は `null`、1 票も無い組番は `0`。 */
export type OddsTable<V> = Readonly<Record<string, V | null>>;

/** 確定オッズ。締切後に確定する値なので、締切前には見えない。 */
export interface FinalOdds {
  readonly trifecta: OddsTable<number>;
  readonly trio: OddsTable<number>;
  readonly exacta: OddsTable<number>;
  readonly quinella: OddsTable<number>;
  readonly quinellaPlace: OddsTable<OddsRange>;
  readonly win: OddsTable<number>;
  readonly place: OddsTable<OddsRange>;
}

export interface ResultEntry {
  readonly boat: BoatNumber;
  readonly course: number | null;
  /** スタートタイミング（秒）。フライングは負の値。 */
  readonly startTiming: number | null;
  /** 着順（1〜6）。失格・欠場は `null`。 */
  readonly place: number | null;
  /** 失格・欠場などの区分。着順が付いた艇は `null`。 */
  readonly status: FinishStatus | null;
  readonly racerNumber: number | null;
  readonly name: string | null;
}

/**
 * 払戻表の 1 行。公式サイトの払戻表は 4 通りの形を取る。
 *
 * - `paid`: 通常の的中と払戻金
 * - `unpriced`（票なし）: 的中の組番だが票が 1 票も無く、払戻金が定義されない
 * - `special`（特払）: 賭式は成立したが的中票が無く、全票に 100 円あたり 70 円を払う
 * - `void`（不成立）: 返還艇で賭式そのものが成立せず、全額（100 円あたり 100 円）を返す
 */
export type PayoutRow =
  | { readonly kind: 'paid'; readonly combination: string; readonly amount: number }
  | { readonly kind: 'unpriced'; readonly combination: string }
  | { readonly kind: 'special'; readonly amount: number; readonly label: string | null }
  | { readonly kind: 'void'; readonly amount: number; readonly label: string | null };

export interface Result {
  /** レース中止・不開催。全賭式の払戻表が空のとき。 */
  readonly cancelled: boolean;
  readonly entries: readonly ResultEntry[];
  readonly technique: Technique | null;
  /** 返還艇（フライング・出遅れ・欠場）。この艇を含む舟券は返還になる。 */
  readonly refunds: readonly BoatNumber[];
  /** 賭式ごとの払戻表。同着では 1 つの賭式に複数の行が入る。 */
  readonly payouts: Readonly<Record<BetType, readonly PayoutRow[]>>;
  readonly weather: Weather;
}

/** 1 レースの全データ。分析用で、戦略にはこのまま渡さない。 */
export interface Race {
  readonly key: RaceKey;
  readonly card: RaceCard;
  /** 直前情報。展示タイムが 1 艇も入っていなければ未公開とみなして `null`。 */
  readonly preview: Preview | null;
  readonly finalOdds: FinalOdds | null;
  /** 結果。まだ確定していなければ `null`。 */
  readonly result: Result | null;
}

/**
 * 締切前に見えている情報だけのビュー。戦略はこれを受け取る。
 * 結果と確定オッズは型にも実体にも含まれないので、読もうとするとコンパイルエラーになる。
 */
export interface PreRace {
  readonly key: RaceKey;
  readonly card: RaceCard;
  readonly preview: Preview | null;
}

/** 確定オッズを覗く戦略用のビュー。これを使った検証は「リークあり」として扱う。 */
export interface PreRaceWithFinalOdds extends PreRace {
  readonly finalOdds: FinalOdds | null;
}

/** 締切順。締切時刻が無いレースは同じ日の最後に回す。 */
export function compareRaces(a: Race, b: Race): number {
  return (
    a.key.date.localeCompare(b.key.date) ||
    (a.card.closedAt ?? '~').localeCompare(b.card.closedAt ?? '~') ||
    a.key.stadium - b.key.stadium ||
    a.key.race - b.key.race
  );
}
