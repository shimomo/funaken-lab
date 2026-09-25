import { type BacktestReport, isCounted, OUTCOME_LABELS, OUTCOMES } from '@funaken-lab/core';
import { count, percent, signedYen, yen } from '../format.ts';

interface Props {
  readonly report: BacktestReport;
  readonly missing: readonly string[];
}

export function ReportView({ report, missing }: Props) {
  const { total, roiInterval } = report;
  return (
    <section className="panel" aria-labelledby="report-title">
      <h2 id="report-title">{report.strategy.name}</h2>
      <p className="muted">
        {report.period.from ?? '—'} 〜 {report.period.to ?? '—'}・{count(report.races.total)} レース
        {missing.length > 0 && `（データなし ${missing.length} 日）`}
      </p>

      {report.leaky && (
        <p className="warning" role="note">
          リークあり: 確定オッズは締切後に決まる値です。この回収率は実際の購入では再現できません。
        </p>
      )}

      <dl className="metrics">
        <div className="metric metric-main">
          <dt>回収率</dt>
          <dd>{percent(total.roi)}</dd>
          <dd className="muted">
            95% 区間 {percent(roiInterval?.lower ?? null)} 〜 {percent(roiInterval?.upper ?? null)}
          </dd>
        </div>
        <div className="metric">
          <dt>的中率</dt>
          <dd>{percent(report.hitRate)}</dd>
          <dd className="muted">
            {count(total.hits)} / {count(total.bets)} 点
          </dd>
        </div>
        <div className="metric">
          <dt>レース的中率</dt>
          <dd>{percent(report.raceHitRate)}</dd>
          <dd className="muted">
            {count(report.races.hit)} / {count(report.races.counted)} レース
          </dd>
        </div>
        <div className="metric">
          <dt>損益</dt>
          <dd>{signedYen(total.payout - total.stake)}</dd>
          <dd className="muted">購入 {yen(total.stake)}</dd>
          <dd className="muted">払戻 {yen(total.payout)}</dd>
        </div>
        <div className="metric">
          <dt>最大ドローダウン</dt>
          <dd>{yen(report.maxDrawdown)}</dd>
          <dd className="muted">累計損益の最大下落</dd>
        </div>
      </dl>

      <h3>決着の内訳</h3>
      <p className="muted">返還・不成立・中止・票なしは、回収率の母数から外しています。</p>
      <dl className="outcomes">
        {OUTCOMES.map((outcome) => (
          <div key={outcome} className={isCounted(outcome) ? undefined : 'excluded'}>
            <dt>{OUTCOME_LABELS[outcome]}</dt>
            <dd>{count(report.tickets[outcome])}</dd>
          </div>
        ))}
      </dl>

      <h3>場別</h3>
      <div className="table-scroll">
        <table className="by-stadium">
          <thead>
            <tr>
              <th scope="col">場</th>
              <th scope="col">回収率</th>
              <th scope="col">点数</th>
              <th scope="col">的中</th>
              <th scope="col">購入</th>
              <th scope="col">払戻</th>
            </tr>
          </thead>
          <tbody>
            {report.byStadium.map((stadium) => (
              <tr key={stadium.stadium}>
                <th scope="row">{stadium.name}</th>
                <td>{percent(stadium.roi)}</td>
                <td>{count(stadium.bets)}</td>
                <td>{count(stadium.hits)}</td>
                <td>{yen(stadium.stake)}</td>
                <td>{yen(stadium.payout)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
