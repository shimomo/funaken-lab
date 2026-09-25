import { describe, expect, it } from 'vitest';
import { fetchTurnmarkDay, fetchTurnmarkDays } from '../src/source/turnmark.ts';
import { rawDayOf } from './fixtures.ts';

function fakeFetch(days: Record<string, unknown>, requested: string[] = []): typeof fetch {
  return async (input) => {
    const url = String(input);
    requested.push(url);
    const date = url.match(/(\d{8})\.json$/)?.[1];
    const body = date === undefined ? undefined : days[date];
    return body === undefined
      ? new Response('Not Found', { status: 404 })
      : new Response(JSON.stringify(body), { status: 200 });
  };
}

describe('fetchTurnmarkDay', () => {
  it('日付から URL を組み立てて 1 日分を読む', async () => {
    const requested: string[] = [];
    const races = await fetchTurnmarkDay('2026-08-01', {
      fetch: fakeFetch({ '20260801': rawDayOf('normal', 'firstRace') }, requested),
    });
    expect(requested).toEqual(['https://turnmark.github.io/api/v1/2026/20260801.json']);
    expect(races?.map((race) => race.key.race)).toEqual([1, 12]);
  });

  it('データの無い日は null', async () => {
    expect(await fetchTurnmarkDay('2026-08-02', { fetch: fakeFetch({}) })).toBeNull();
  });

  it('404 以外のエラーは例外', async () => {
    const failing: typeof fetch = async () => new Response('', { status: 503 });
    await expect(fetchTurnmarkDay('2026-08-01', { fetch: failing })).rejects.toThrow(/503/);
  });
});

describe('fetchTurnmarkDays', () => {
  it('日付順にまとめ、データの無い日を別に返す', async () => {
    const progress: number[] = [];
    const { races, missing } = await fetchTurnmarkDays(['2026-01-01', '2026-01-02', '2026-01-03'], {
      fetch: fakeFetch({ '20260101': rawDayOf('voided'), '20260103': rawDayOf('refunded') }),
      concurrency: 2,
      onDay: ({ done }) => progress.push(done),
    });
    expect(races.map((race) => race.key.stadium)).toEqual([21, 6]);
    expect(missing).toEqual(['2026-01-02']);
    expect(progress).toEqual([1, 2, 3]);
  });
});

describe('fetchTurnmarkDays のキャッシュ', () => {
  it('取得できた日は使い回し、データの無かった日は取り直す', async () => {
    const requested: string[] = [];
    const cache = new Map();
    const options = { fetch: fakeFetch({ '20260101': rawDayOf('voided') }, requested), cache };
    await fetchTurnmarkDays(['2026-01-01', '2026-01-02'], options);
    await fetchTurnmarkDays(['2026-01-01', '2026-01-02'], options);
    expect(requested.filter((url) => url.endsWith('20260101.json'))).toHaveLength(1);
    expect(requested.filter((url) => url.endsWith('20260102.json'))).toHaveLength(2);
  });

  it('失敗した日はキャッシュに残さない', async () => {
    const cache = new Map();
    const failing: typeof fetch = async () => new Response('', { status: 503 });
    await expect(fetchTurnmarkDays(['2026-01-01'], { fetch: failing, cache })).rejects.toThrow();
    expect(cache.size).toBe(0);
  });
});
