import { eachDate, PRESET_STRATEGIES, type Race, runBacktest } from '@funaken-lab/core';
import { fetchTurnmarkDays } from '@funaken-lab/core/turnmark';
import type { RunRequest, WorkerResponse } from './protocol.ts';

// 取得と集計は重いので、画面を止めないよう Web Worker で回す。
// 取得した日は、期間や戦略を変えて回し直すときに使い回す。
const cache = new Map<string, Promise<Race[] | null>>();

function post(response: WorkerResponse): void {
  self.postMessage(response);
}

async function run({ id, from, to, strategyId }: RunRequest): Promise<void> {
  try {
    const strategy = PRESET_STRATEGIES.find((candidate) => candidate.id === strategyId);
    if (strategy === undefined) {
      throw new Error(`戦略が見つかりません: ${strategyId}`);
    }
    const { races, missing } = await fetchTurnmarkDays(eachDate(from, to), {
      cache,
      onDay: ({ date, done, total }) => post({ type: 'progress', id, date, done, total }),
    });
    post({ type: 'done', id, report: runBacktest(races, strategy), missing });
  } catch (error) {
    post({ type: 'error', id, message: error instanceof Error ? error.message : String(error) });
  }
}

self.addEventListener('message', (event: MessageEvent<RunRequest>) => {
  void run(event.data);
});
