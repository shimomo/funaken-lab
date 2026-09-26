import { describe, expect, it } from 'vitest';
import { runBacktest } from '../src/backtest.ts';
import { PRESET_STRATEGIES } from '../src/presets.ts';
import { allRaces } from './fixtures.ts';

describe('PRESET_STRATEGIES', () => {
  it('id が重複していない（画面と CLI は id で戦略を探すため）', () => {
    const ids = PRESET_STRATEGIES.map((strategy) => strategy.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(PRESET_STRATEGIES.map((strategy) => [strategy.id, strategy] as const))(
    '%s はフィクスチャの全レースで例外なく回る',
    (_, strategy) => {
      expect(() => runBacktest(allRaces(), strategy, { bootstrap: null })).not.toThrow();
    },
  );
});
