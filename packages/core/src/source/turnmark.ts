import type { Race } from '../domain/race.ts';
import { parseTurnmarkDay } from './normalize.ts';

export const TURNMARK_BASE_URL = 'https://turnmark.github.io/api/v1';

export interface FetchDayOptions {
  readonly baseUrl?: string;
  readonly fetch?: typeof globalThis.fetch;
  readonly signal?: AbortSignal;
}

/**
 * 1 日分のレースを取得する。データの無い日（未来の日付・対応期間外）は `null`。
 * Turnmark API は前日までの確定データなので、当日分はまだ無い。
 */
export async function fetchTurnmarkDay(
  date: string,
  options: FetchDayOptions = {},
): Promise<Race[] | null> {
  const compact = date.replaceAll('-', '');
  const url = `${options.baseUrl ?? TURNMARK_BASE_URL}/${compact.slice(0, 4)}/${compact}.json`;
  const response = await (options.fetch ?? globalThis.fetch)(
    url,
    options.signal ? { signal: options.signal } : {},
  );
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Turnmark API から取得できませんでした: ${response.status} ${url}`);
  }
  return parseTurnmarkDay(await response.json());
}

export interface FetchDaysOptions extends FetchDayOptions {
  /** 同時に取得する日数。GitHub Pages に負荷をかけないよう小さく保つ。 */
  readonly concurrency?: number;
  /** 取得済みの日を使い回すためのキャッシュ。渡したマップに日付ごとの結果を貯める。 */
  readonly cache?: Map<string, Promise<Race[] | null>>;
  readonly onDay?: (progress: {
    readonly date: string;
    readonly done: number;
    readonly total: number;
  }) => void;
}

export interface FetchedDays {
  readonly races: Race[];
  /** データの無かった日。 */
  readonly missing: string[];
}

export async function fetchTurnmarkDays(
  dates: readonly string[],
  options: FetchDaysOptions = {},
): Promise<FetchedDays> {
  const days = new Map<string, Race[] | null>();
  const queue = [...dates];
  let done = 0;
  const worker = async (): Promise<void> => {
    for (let date = queue.shift(); date !== undefined; date = queue.shift()) {
      days.set(date, await load(date, options));
      done += 1;
      options.onDay?.({ date, done, total: dates.length });
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, options.concurrency ?? 3) }, worker));

  const races: Race[] = [];
  const missing: string[] = [];
  for (const date of dates) {
    const day = days.get(date);
    if (day === null || day === undefined) {
      missing.push(date);
    } else {
      races.push(...day);
    }
  }
  return { races, missing };
}

async function load(date: string, options: FetchDaysOptions): Promise<Race[] | null> {
  const { cache } = options;
  const pending = cache?.get(date) ?? fetchTurnmarkDay(date, options);
  cache?.set(date, pending);
  try {
    const races = await pending;
    if (races === null) {
      // まだ公開されていない日かもしれないので、データの無かった日も次の実行で取り直す
      cache?.delete(date);
    }
    return races;
  } catch (error) {
    cache?.delete(date);
    throw error;
  }
}
