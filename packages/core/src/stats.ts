/** 再現できる乱数（mulberry32）。同じ seed なら同じ列を返す。 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Interval {
  readonly lower: number;
  readonly upper: number;
  /** 信頼水準（0.95 なら 95%）。 */
  readonly level: number;
  readonly samples: number;
}

export interface BootstrapOptions {
  readonly samples: number;
  readonly seed: number;
  readonly level?: number;
}

/**
 * 回収率のブートストラップ信頼区間（パーセンタイル法）。
 * 同じレースの買い目は独立ではないので、舟券ではなくレースを単位に復元抽出する。
 */
export function bootstrapRoi(
  stakes: readonly number[],
  payouts: readonly number[],
  options: BootstrapOptions,
): Interval | null {
  const n = stakes.length;
  if (n === 0 || payouts.length !== n) {
    return null;
  }
  const level = options.level ?? 0.95;
  const random = mulberry32(options.seed);
  const estimates = new Float64Array(options.samples);
  for (let sample = 0; sample < options.samples; sample += 1) {
    let stake = 0;
    let payout = 0;
    for (let draw = 0; draw < n; draw += 1) {
      const index = Math.floor(random() * n);
      stake += stakes[index] ?? 0;
      payout += payouts[index] ?? 0;
    }
    estimates[sample] = stake === 0 ? 0 : payout / stake;
  }
  estimates.sort();
  const tail = (1 - level) / 2;
  return {
    lower: quantile(estimates, tail),
    upper: quantile(estimates, 1 - tail),
    level,
    samples: options.samples,
  };
}

/** 昇順に並んだ値の分位点（線形補間）。 */
export function quantile(sorted: ArrayLike<number>, q: number): number {
  if (sorted.length === 0) {
    return Number.NaN;
  }
  const position = (sorted.length - 1) * Math.min(Math.max(q, 0), 1);
  const below = Math.floor(position);
  const above = Math.ceil(position);
  const low = sorted[below] ?? Number.NaN;
  const high = sorted[above] ?? Number.NaN;
  return low + (high - low) * (position - below);
}
