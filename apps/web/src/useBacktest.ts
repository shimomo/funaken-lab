import type { BacktestReport } from '@funaken-lab/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RunRequest, WorkerResponse } from './worker/protocol.ts';

export type BacktestState =
  | { readonly status: 'idle' }
  | { readonly status: 'running'; readonly done: number; readonly total: number }
  | {
      readonly status: 'done';
      readonly report: BacktestReport;
      readonly missing: readonly string[];
    }
  | { readonly status: 'error'; readonly message: string };

export type RunInput = Omit<RunRequest, 'type' | 'id'>;

export function useBacktest(): {
  readonly state: BacktestState;
  readonly run: (input: RunInput) => void;
} {
  const [state, setState] = useState<BacktestState>({ status: 'idle' });
  const worker = useRef<Worker | null>(null);
  const latest = useRef(0);

  useEffect(() => {
    const instance = new Worker(new URL('./worker/backtest.worker.ts', import.meta.url), {
      type: 'module',
    });
    instance.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      if (response.id !== latest.current) {
        return;
      }
      switch (response.type) {
        case 'progress':
          setState({ status: 'running', done: response.done, total: response.total });
          break;
        case 'done':
          setState({ status: 'done', report: response.report, missing: response.missing });
          break;
        case 'error':
          setState({ status: 'error', message: response.message });
          break;
      }
    });
    worker.current = instance;
    return () => instance.terminate();
  }, []);

  const run = useCallback((input: RunInput) => {
    latest.current += 1;
    setState({ status: 'running', done: 0, total: 0 });
    const request: RunRequest = { type: 'run', id: latest.current, ...input };
    worker.current?.postMessage(request);
  }, []);

  return { state, run };
}
