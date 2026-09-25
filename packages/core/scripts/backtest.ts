/**
 * ターミナルでバックテストを回す。
 *
 *   pnpm backtest --from 2026-09-01 --to 2026-09-07 --strategy boat1-trifecta
 */
import { parseArgs } from 'node:util';
import { runBacktest } from '../src/backtest.ts';
import { addDays, eachDate, isDateString, todayInJapan } from '../src/date.ts';
import { PRESET_STRATEGIES } from '../src/presets.ts';
import { OUTCOME_LABELS, OUTCOMES } from '../src/settle.ts';
import { fetchTurnmarkDays } from '../src/source/turnmark.ts';

const yesterday = addDays(todayInJapan(), -1);
const { values } = parseArgs({
  options: {
    from: { type: 'string', default: addDays(yesterday, -6) },
    to: { type: 'string', default: yesterday },
    strategy: { type: 'string', default: 'boat1-win' },
  },
});

const strategy = PRESET_STRATEGIES.find((candidate) => candidate.id === values.strategy);
if (strategy === undefined) {
  console.error(`戦略が見つかりません: ${values.strategy}`);
  console.error(`使える戦略: ${PRESET_STRATEGIES.map((candidate) => candidate.id).join(', ')}`);
  process.exit(1);
}
if (!isDateString(values.from) || !isDateString(values.to)) {
  console.error('--from と --to は YYYY-MM-DD で指定してください');
  process.exit(1);
}

const { races, missing } = await fetchTurnmarkDays(eachDate(values.from, values.to), {
  onDay: ({ date, done, total }) => process.stderr.write(`\r取得中 ${done}/${total} ${date}`),
});
process.stderr.write('\n');

const report = runBacktest(races, strategy);
const percent = (value: number | null) => (value === null ? '-' : `${(value * 100).toFixed(1)}%`);
const yen = (value: number) => `${value.toLocaleString('ja-JP')}円`;

console.log(`${report.strategy.name}${report.leaky ? '  ※リークあり（確定オッズを使用）' : ''}`);
console.log(`期間 ${values.from} 〜 ${values.to}（データなし ${missing.length} 日）`);
console.log(`レース ${report.races.total}  購入 ${report.races.bought}  的中 ${report.races.hit}`);
console.log(`購入 ${yen(report.total.stake)}  払戻 ${yen(report.total.payout)}`);
console.log(
  `回収率 ${percent(report.total.roi)}（95% 区間 ${percent(report.roiInterval?.lower ?? null)} 〜 ${percent(report.roiInterval?.upper ?? null)}）`,
);
console.log(`的中率 ${percent(report.hitRate)}  最大ドローダウン ${yen(report.maxDrawdown)}`);
console.log(
  OUTCOMES.map((outcome) => `${OUTCOME_LABELS[outcome]} ${report.tickets[outcome]}`).join('  '),
);
