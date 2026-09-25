import type { BacktestReport } from '@funaken-lab/core';

/** 画面から Web Worker へ送る依頼。`id` で古い実行の応答を捨てる。 */
export interface RunRequest {
  readonly type: 'run';
  readonly id: number;
  readonly from: string;
  readonly to: string;
  readonly strategyId: string;
}

export type WorkerResponse =
  | {
      readonly type: 'progress';
      readonly id: number;
      readonly done: number;
      readonly total: number;
      readonly date: string;
    }
  | {
      readonly type: 'done';
      readonly id: number;
      readonly report: BacktestReport;
      readonly missing: readonly string[];
    }
  | { readonly type: 'error'; readonly id: number; readonly message: string };
