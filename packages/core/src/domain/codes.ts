/**
 * Turnmark API の番号フィールドと、公式サイトの表記の対応表。
 * 番号は API（= 公式サイト）の採番をそのまま使う。
 */

export const RANKS = { 1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2' } as const;
export type Rank = (typeof RANKS)[keyof typeof RANKS];

export const GRADES = { 1: 'SG', 2: 'G1', 3: 'G2', 4: 'G3', 5: '一般', 6: 'PG1' } as const;
export type Grade = (typeof GRADES)[keyof typeof GRADES];

export const TECHNIQUES = {
  1: '逃げ',
  2: '差し',
  3: 'まくり',
  4: 'まくり差し',
  5: '抜き',
  6: '恵まれ',
} as const;
export type Technique = (typeof TECHNIQUES)[keyof typeof TECHNIQUES];

export const WEATHER_CONDITIONS = {
  1: '晴',
  2: '曇り',
  3: '雨',
  4: '雪',
  5: '霧',
  6: '台風',
  99: 'その他',
} as const;
export type WeatherCondition = (typeof WEATHER_CONDITIONS)[keyof typeof WEATHER_CONDITIONS];

/** 着順番号 7 以降（失格・欠場など）。1〜6 は着順そのもの。 */
export const FINISH_STATUSES = {
  7: '妨害失格',
  8: 'エンスト失格',
  9: '転覆失格',
  10: '落水失格',
  11: '沈没失格',
  12: '不完走失格',
  13: '失格',
  14: 'フライング欠場',
  15: '出遅れ欠場',
  16: '欠場',
  99: 'その他',
} as const;
export type FinishStatus = (typeof FINISH_STATUSES)[keyof typeof FINISH_STATUSES];

/** 部品交換の部品番号（公式サイトの「部品交換凡例」の掲載順）。 */
export const PARTS = {
  1: 'ピストン',
  2: 'ピストンリング',
  3: '電気一式',
  4: 'キャブレター',
  5: 'シリンダ',
  6: 'クランクシャフト',
  7: 'ギヤケース',
  8: 'キャリアボデー',
} as const;
export type Part = (typeof PARTS)[keyof typeof PARTS];

/** 番号から表記を引く。対応表に無い番号と `null` は `null` を返す。 */
export function lookup<T extends Readonly<Record<number, string>>>(
  table: T,
  code: number | null,
): T[keyof T] | null {
  if (code === null || !Object.hasOwn(table, code)) {
    return null;
  }
  return table[code as keyof T];
}
