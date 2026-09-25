import { describe, expect, it } from 'vitest';
import { addDays, eachDate, isDateString, todayInJapan } from '../src/date.ts';

describe('date', () => {
  it('両端を含めて日付を並べる', () => {
    expect(eachDate('2026-02-27', '2026-03-02')).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ]);
    expect(eachDate('2026-03-02', '2026-03-01')).toEqual([]);
  });

  it('年をまたいで日数を足す', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('存在しない日付を弾く', () => {
    expect(isDateString('2026-02-28')).toBe(true);
    expect(isDateString('2026-02-30')).toBe(false);
    expect(isDateString('20260228')).toBe(false);
    expect(() => addDays('2026-02-30', 1)).toThrow(RangeError);
  });

  it('日付は日本時間で数える', () => {
    expect(todayInJapan(new Date('2026-09-24T15:30:00Z'))).toBe('2026-09-25');
    expect(todayInJapan(new Date('2026-09-24T14:59:00Z'))).toBe('2026-09-24');
  });
});
