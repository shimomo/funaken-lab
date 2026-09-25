/** 全国 24 場。番号は公式サイトのレース場番号。 */
export const STADIUMS = [
  { number: 1, name: '桐生' },
  { number: 2, name: '戸田' },
  { number: 3, name: '江戸川' },
  { number: 4, name: '平和島' },
  { number: 5, name: '多摩川' },
  { number: 6, name: '浜名湖' },
  { number: 7, name: '蒲郡' },
  { number: 8, name: '常滑' },
  { number: 9, name: '津' },
  { number: 10, name: '三国' },
  { number: 11, name: 'びわこ' },
  { number: 12, name: '住之江' },
  { number: 13, name: '尼崎' },
  { number: 14, name: '鳴門' },
  { number: 15, name: '丸亀' },
  { number: 16, name: '児島' },
  { number: 17, name: '宮島' },
  { number: 18, name: '徳山' },
  { number: 19, name: '下関' },
  { number: 20, name: '若松' },
  { number: 21, name: '芦屋' },
  { number: 22, name: '福岡' },
  { number: 23, name: '唐津' },
  { number: 24, name: '大村' },
] as const;

export type StadiumNumber = (typeof STADIUMS)[number]['number'];

export function isStadiumNumber(value: unknown): value is StadiumNumber {
  return STADIUMS.some((stadium) => stadium.number === value);
}

export function stadiumName(stadium: StadiumNumber): string {
  return STADIUMS[stadium - 1]?.name ?? String(stadium);
}
