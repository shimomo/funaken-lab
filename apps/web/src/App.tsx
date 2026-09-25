import {
  addDays,
  eachDate,
  isDateString,
  PRESET_STRATEGIES,
  todayInJapan,
} from '@funaken-lab/core';
import { type FormEvent, useState } from 'react';
import { ReportView } from './components/ReportView.tsx';
import { useBacktest } from './useBacktest.ts';

/** Turnmark API の対応期間の始まり。 */
const FIRST_DATE = '2026-01-01';
/** 生の JSON を 1 日ずつ読むので、期間は当面ここまでにしておく。 */
const MAX_DAYS = 92;

export function App() {
  const yesterday = addDays(todayInJapan(), -1);
  const [from, setFrom] = useState(addDays(yesterday, -6));
  const [to, setTo] = useState(yesterday);
  const [strategyId, setStrategyId] = useState(PRESET_STRATEGIES[0]?.id ?? '');
  const { state, run } = useBacktest();

  const strategy = PRESET_STRATEGIES.find((candidate) => candidate.id === strategyId);
  const problem = validate(from, to, yesterday);
  const running = state.status === 'running';

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (problem === null) {
      run({ from, to, strategyId });
    }
  };

  return (
    <>
      <header className="site-header">
        <h1>舟券ラボ</h1>
        <p>
          {
            'ボートレースの買い方を、実際のレース結果で検証する実験室。締切前に見えていた情報だけで買い目を決め、払戻表で決済します。'
          }
        </p>
      </header>

      <main>
        <form className="panel" onSubmit={submit}>
          <div className="fields">
            <label>
              開始日
              <input
                type="date"
                value={from}
                min={FIRST_DATE}
                max={yesterday}
                onChange={(event) => setFrom(event.target.value)}
              />
            </label>
            <label>
              終了日
              <input
                type="date"
                value={to}
                min={FIRST_DATE}
                max={yesterday}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
            <label className="wide">
              戦略
              <select value={strategyId} onChange={(event) => setStrategyId(event.target.value)}>
                {PRESET_STRATEGIES.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {strategy !== undefined && <p className="muted">{strategy.description}</p>}
          {problem !== null && <p className="error">{problem}</p>}
          <button type="submit" disabled={running || problem !== null}>
            {running ? '検証中…' : '検証する'}
          </button>
        </form>

        {state.status === 'running' && (
          <div className="panel" aria-live="polite">
            <p>
              レースデータを取得中… {state.done} / {state.total || '—'} 日
            </p>
            <progress value={state.done} max={Math.max(state.total, 1)} />
          </div>
        )}
        {state.status === 'error' && (
          <p className="panel error" role="alert">
            {state.message}
          </p>
        )}
        {state.status === 'done' && <ReportView report={state.report} missing={state.missing} />}
      </main>

      <footer className="site-footer">
        <p>
          データ: <a href="https://github.com/turnmark/api">Turnmark API</a>
          （前日までの確定データ）。非公式のツールで、データの正確性は保証しません。
        </p>
      </footer>
    </>
  );
}

function validate(from: string, to: string, yesterday: string): string | null {
  if (!isDateString(from) || !isDateString(to)) {
    return '日付を入力してください。';
  }
  if (from > to) {
    return '開始日は終了日より前にしてください。';
  }
  if (from < FIRST_DATE || to > yesterday) {
    return `データがあるのは ${FIRST_DATE} から前日（${yesterday}）までです。`;
  }
  if (eachDate(from, to).length > MAX_DAYS) {
    return `期間は ${MAX_DAYS} 日以内にしてください。`;
  }
  return null;
}
