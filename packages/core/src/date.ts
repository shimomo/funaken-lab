/** `YYYY-MM-DD` の日付文字列を扱う小さな道具。日付は日本時間で数える。 */

const DAY_MS = 24 * 60 * 60 * 1000;
const PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: string): boolean {
  if (!PATTERN.test(value)) {
    return false;
  }
  const time = Date.parse(`${value}T00:00:00Z`);
  // 2026-02-30 のような存在しない日付は NaN か翌月への繰り上がりになる
  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(value);
}

export function addDays(date: string, days: number): string {
  return new Date(toUtc(date).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** `from` から `to` までの日付（両端を含む）。 */
export function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

export function todayInJapan(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(now);
}

function toUtc(date: string): Date {
  if (!isDateString(date)) {
    throw new RangeError(`日付は YYYY-MM-DD で指定してください: ${date}`);
  }
  return new Date(`${date}T00:00:00Z`);
}
