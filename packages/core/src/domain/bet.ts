import { type BoatNumber, isBoatNumber } from './boat.ts';

export const BET_TYPES = [
  'trifecta',
  'trio',
  'exacta',
  'quinella',
  'quinellaPlace',
  'win',
  'place',
] as const;

export type BetType = (typeof BET_TYPES)[number];

export const BET_TYPE_LABELS = {
  trifecta: '3連単',
  trio: '3連複',
  exacta: '2連単',
  quinella: '2連複',
  quinellaPlace: '拡連複',
  win: '単勝',
  place: '複勝',
} as const satisfies Record<BetType, string>;

/** 賭式ごとに選ぶ艇の数と、着順を区別するかどうか。 */
const BET_SPECS = {
  trifecta: { size: 3, ordered: true },
  trio: { size: 3, ordered: false },
  exacta: { size: 2, ordered: true },
  quinella: { size: 2, ordered: false },
  quinellaPlace: { size: 2, ordered: false },
  win: { size: 1, ordered: true },
  place: { size: 1, ordered: true },
} as const satisfies Record<BetType, { size: 1 | 2 | 3; ordered: boolean }>;

type Tuple<T, N extends number, R extends readonly T[] = []> = R['length'] extends N
  ? R
  : Tuple<T, N, readonly [...R, T]>;

/** 賭式に応じた長さの艇番タプル。3連単なら `[1着, 2着, 3着]`。 */
export type BoatsOf<T extends BetType> = Tuple<BoatNumber, (typeof BET_SPECS)[T]['size']>;

/** 1 点ぶんの舟券。`stake` は購入額（円、100 円単位）。 */
export type Bet<T extends BetType = BetType> = {
  [K in T]: { readonly type: K; readonly boats: BoatsOf<K>; readonly stake: number };
}[T];

export const MIN_STAKE = 100;

export function bet<T extends BetType>(
  type: T,
  boats: BoatsOf<T>,
  stake: number = MIN_STAKE,
): Bet<T> {
  // `Bet<T>` はジェネリックのままだと組み立てを型で追えないので、形は assertValidBet で実行時に保証する
  const created = { type, boats, stake } as unknown as Bet<T>;
  assertValidBet(created);
  return created;
}

/**
 * 払戻表と突き合わせるための組番表記。
 * 着順を区別する賭式は `4-3-1`、区別しない賭式は昇順で `1=3=4`（公式サイトと同じ）。
 */
export function combinationKey(target: Bet): string {
  // タプルの union のままだとメソッドの戻り値が崩れるので、配列として扱う
  const boats: readonly BoatNumber[] = target.boats;
  return BET_SPECS[target.type].ordered
    ? boats.join('-')
    : [...boats].sort((a, b) => a - b).join('=');
}

export class InvalidBetError extends Error {
  override readonly name = 'InvalidBetError';
}

/** 戦略が返した値など、形の保証が無い舟券。 */
export interface BetLike {
  readonly type: BetType;
  readonly boats: readonly number[];
  readonly stake: number;
}

export function assertValidBet(target: BetLike): asserts target is Bet {
  const spec = BET_SPECS[target.type];
  if (target.boats.length !== spec.size) {
    throw new InvalidBetError(
      `${BET_TYPE_LABELS[target.type]}は ${spec.size} 艇を選ぶ賭式です: [${target.boats.join(', ')}]`,
    );
  }
  if (!target.boats.every(isBoatNumber)) {
    throw new InvalidBetError(`艇番は 1〜6 です: [${target.boats.join(', ')}]`);
  }
  if (new Set(target.boats).size !== target.boats.length) {
    throw new InvalidBetError(`同じ艇を 2 回選んでいます: [${target.boats.join(', ')}]`);
  }
  if (
    !Number.isInteger(target.stake) ||
    target.stake < MIN_STAKE ||
    target.stake % MIN_STAKE !== 0
  ) {
    throw new InvalidBetError(`購入額は 100 円単位です: ${target.stake}`);
  }
}

/**
 * フォーメーション表記を 1 点ずつの舟券に展開する。
 *
 * - `formation('trifecta', '1-23-234')` → 1-2-3, 1-2-4, 1-3-2, 1-3-4
 * - 着順を区別しない賭式では、同じ組み合わせを 1 点にまとめる
 */
export function formation(type: BetType, notation: string, stake: number = MIN_STAKE): Bet[] {
  const spec = BET_SPECS[type];
  const groups = notation.split('-').map((group) => parseGroup(group, notation));
  if (groups.length !== spec.size) {
    throw new InvalidBetError(
      `${BET_TYPE_LABELS[type]}の表記は ${spec.size} 区切りです: ${notation}`,
    );
  }
  return uniqueBets(type, product(groups), stake);
}

/** ボックス。選んだ艇のすべての並び（着順を区別しない賭式は組み合わせ）を買う。 */
export function box(type: BetType, boats: readonly BoatNumber[], stake: number = MIN_STAKE): Bet[] {
  const groups = Array.from({ length: BET_SPECS[type].size }, () => boats);
  return uniqueBets(type, product(groups), stake);
}

function parseGroup(group: string, notation: string): BoatNumber[] {
  const boats = [...group].map(Number);
  if (boats.length === 0 || !boats.every(isBoatNumber) || new Set(boats).size !== boats.length) {
    throw new InvalidBetError(`買い目の表記が読めません: ${notation}`);
  }
  return boats;
}

function product(groups: readonly (readonly BoatNumber[])[]): BoatNumber[][] {
  return groups.reduce<BoatNumber[][]>(
    (rows, group) =>
      rows.flatMap((row) =>
        group.filter((boat) => !row.includes(boat)).map((boat) => [...row, boat]),
      ),
    [[]],
  );
}

function uniqueBets(type: BetType, rows: readonly BoatNumber[][], stake: number): Bet[] {
  const bets = new Map<string, Bet>();
  for (const boats of rows) {
    const created = bet(type, boats as unknown as BoatsOf<typeof type>, stake);
    bets.set(combinationKey(created), created);
  }
  return [...bets.values()];
}
