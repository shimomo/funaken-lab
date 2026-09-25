import { assertValidBet, InvalidBetError } from './domain/bet.ts';
import { compareRaces, type Race, type RaceKey } from './domain/race.ts';
import { type StadiumNumber, stadiumName } from './domain/stadium.ts';
import { isCounted, OUTCOMES, type Outcome, settle } from './settle.ts';
import { bootstrapRoi, type Interval } from './stats.ts';
import { type AnyStrategy, decide, type Lookahead } from './strategy.ts';

export interface BacktestOptions {
  /** 回収率の信頼区間を出すときのブートストラップ設定。`null` なら計算しない。 */
  readonly bootstrap?: { readonly samples: number; readonly seed: number } | null;
}

export interface Tally {
  /** 母数に入った舟券の点数。 */
  readonly bets: number;
  readonly hits: number;
  /** 母数に入った購入額（円）。 */
  readonly stake: number;
  /** 母数に入った払戻額（円）。 */
  readonly payout: number;
  /** 回収率（払戻 ÷ 購入）。母数が 0 なら `null`。 */
  readonly roi: number | null;
}

export interface StadiumTally extends Tally {
  readonly stadium: StadiumNumber;
  readonly name: string;
}

export interface BacktestReport {
  readonly strategy: {
    readonly id: string;
    readonly name: string;
    readonly lookahead: Lookahead;
  };
  /** 確定オッズなど、締切前には見えない情報を使った検証か。 */
  readonly leaky: boolean;
  readonly period: { readonly from: string | null; readonly to: string | null };
  readonly races: {
    /** 検証したレース数。 */
    readonly total: number;
    /** 1 点以上買ったレース数。 */
    readonly bought: number;
    /** 母数に入った舟券が 1 点以上あるレース数。 */
    readonly counted: number;
    /** 1 点以上的中したレース数。 */
    readonly hit: number;
  };
  /** 決着ごとの点数。母数から外したものも含む。 */
  readonly tickets: Readonly<Record<Outcome, number>>;
  readonly total: Tally;
  readonly roiInterval: Interval | null;
  /** 的中率（的中点数 ÷ 母数の点数）。 */
  readonly hitRate: number | null;
  /** レース的中率（的中レース ÷ 母数のあるレース）。 */
  readonly raceHitRate: number | null;
  /** 締切順に損益を積み上げたときの、最高値からの最大下落幅（円）。 */
  readonly maxDrawdown: number;
  readonly byStadium: readonly StadiumTally[];
}

export class StrategyError extends Error {
  override readonly name = 'StrategyError';
  readonly race: RaceKey;

  constructor(message: string, race: RaceKey, options?: ErrorOptions) {
    super(message, options);
    this.race = race;
  }
}

const DEFAULT_BOOTSTRAP = { samples: 2000, seed: 20260101 } as const;

/** レースを締切順に並べ直して流し、戦略の買い目を払戻表で決済して集計する。 */
export function runBacktest(
  races: readonly Race[],
  strategy: AnyStrategy,
  options: BacktestOptions = {},
): BacktestReport {
  const tickets = Object.fromEntries(OUTCOMES.map((outcome) => [outcome, 0])) as Record<
    Outcome,
    number
  >;
  const stadiums = new Map<StadiumNumber, MutableTally>();
  const total = emptyTally();
  const raceStakes: number[] = [];
  const racePayouts: number[] = [];
  let bought = 0;
  let hitRaces = 0;
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  const ordered = [...races].sort(compareRaces);

  for (const race of ordered) {
    const bets = decideSafely(strategy, race);
    if (bets.length === 0) {
      continue;
    }
    bought += 1;
    const stadium = stadiums.get(race.key.stadium) ?? emptyTally();
    stadiums.set(race.key.stadium, stadium);
    let raceStake = 0;
    let racePayout = 0;
    let raceHit = false;

    for (const bet of bets) {
      const { outcome, payout } = settle(bet, race.result);
      tickets[outcome] += 1;
      if (!isCounted(outcome)) {
        continue;
      }
      const hit = outcome === 'hit';
      raceHit ||= hit;
      raceStake += bet.stake;
      racePayout += payout;
      for (const tally of [total, stadium]) {
        tally.bets += 1;
        tally.hits += hit ? 1 : 0;
        tally.stake += bet.stake;
        tally.payout += payout;
      }
    }

    if (raceStake > 0) {
      raceStakes.push(raceStake);
      racePayouts.push(racePayout);
      hitRaces += raceHit ? 1 : 0;
      equity += racePayout - raceStake;
      peak = Math.max(peak, equity);
      maxDrawdown = Math.max(maxDrawdown, peak - equity);
    }
  }

  const bootstrap = options.bootstrap === undefined ? DEFAULT_BOOTSTRAP : options.bootstrap;
  return {
    strategy: { id: strategy.id, name: strategy.name, lookahead: strategy.lookahead },
    leaky: strategy.lookahead !== 'none',
    period: { from: ordered[0]?.key.date ?? null, to: ordered.at(-1)?.key.date ?? null },
    races: { total: races.length, bought, counted: raceStakes.length, hit: hitRaces },
    tickets,
    total: finish(total),
    roiInterval: bootstrap === null ? null : bootstrapRoi(raceStakes, racePayouts, bootstrap),
    hitRate: ratio(total.hits, total.bets),
    raceHitRate: ratio(hitRaces, raceStakes.length),
    maxDrawdown,
    byStadium: [...stadiums]
      .sort(([a], [b]) => a - b)
      .map(([stadium, tally]) => ({ stadium, name: stadiumName(stadium), ...finish(tally) })),
  };
}

interface MutableTally {
  bets: number;
  hits: number;
  stake: number;
  payout: number;
}

function emptyTally(): MutableTally {
  return { bets: 0, hits: 0, stake: 0, payout: 0 };
}

function finish(tally: MutableTally): Tally {
  return { ...tally, roi: ratio(tally.payout, tally.stake) };
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

function decideSafely(strategy: AnyStrategy, race: Race) {
  const { date, stadium, race: number } = race.key;
  const where = `${date} ${stadiumName(stadium)} ${number}R`;
  try {
    const bets = decide(strategy, race);
    for (const bet of bets) {
      assertValidBet(bet);
    }
    return bets;
  } catch (error) {
    const reason = error instanceof InvalidBetError ? '買い目が不正です' : '戦略が例外を投げました';
    const detail = error instanceof Error ? error.message : String(error);
    throw new StrategyError(`${where}: ${reason}: ${detail}`, race.key, { cause: error });
  }
}
