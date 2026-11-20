import { describe, it, expect } from 'vitest';
import {
  isoDate,
  addDays,
  startOfWeekFor,
  normalizeWeekData,
  calculatePomodoroHourSplits
} from './dateUtils';

describe('dateUtils', () => {
  it('isoDate formats a date as YYYY-MM-DD', () => {
    expect(isoDate(new Date(2026, 10, 20))).toBe('2026-11-20');
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('addDays crosses month boundaries correctly', () => {
    expect(isoDate(addDays(new Date(2026, 10, 30), 1))).toBe('2026-12-01');
    expect(isoDate(addDays(new Date(2026, 0, 1), -1))).toBe('2025-12-31');
  });

  it('startOfWeekFor respects saturday / sunday / monday starts', () => {
    const friday = new Date(2026, 10, 20); // 2026-11-20 is a Friday
    expect(isoDate(startOfWeekFor(friday, 'saturday'))).toBe('2026-11-14');
    expect(isoDate(startOfWeekFor(friday, 'sunday'))).toBe('2026-11-15');
    expect(isoDate(startOfWeekFor(friday, 'monday'))).toBe('2026-11-16');
  });

  it('normalizeWeekData always yields the displayed 7 days with 24 hours each', () => {
    const week = normalizeWeekData({}, new Date(2026, 10, 14));
    const keys = Object.keys(week.days);

    expect(keys.length).toBeGreaterThanOrEqual(7);
    expect(keys).toContain('2026-11-14');
    expect(keys).toContain('2026-11-20');
    expect(Object.keys(week.days['2026-11-14'].hours).length).toBe(24);
    expect(week.days['2026-11-14'].goldenGoal.text).toBe('');
  });

  it('calculatePomodoroHourSplits keeps a same-hour session in one hour', () => {
    const splits = calculatePomodoroHourSplits(
      new Date(2026, 10, 20, 10, 10),
      new Date(2026, 10, 20, 10, 35),
      25
    );
    expect(splits).toEqual([{ hourKey: '10am', minutes: 25 }]);
  });

  it('calculatePomodoroHourSplits rounds a cross-hour session to 15-minute blocks', () => {
    const splits = calculatePomodoroHourSplits(
      new Date(2026, 10, 20, 10, 50),
      new Date(2026, 10, 20, 11, 35),
      45
    );
    expect(splits).toEqual([
      { hourKey: '10am', minutes: 15 },
      { hourKey: '11am', minutes: 30 }
    ]);
  });
});
