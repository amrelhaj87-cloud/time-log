import { describe, it, expect } from 'vitest';
import {
  WRAP_UP_START_HOUR,
  getWrapUpDayKey,
  getWrapUpSeenKey,
  shouldOfferEveningWrapUp,
  buildWrapUpSummary
} from './eveningWrapUp';
import type { DayData, TagTargets } from '../types';

const targets: TagTargets = { E: 6, V: 2, R: 3, S: 2, SC: 2 };

const makeDay = (hours: Record<string, { text: string; tag: DayData['hours'][string]['tag'] }>, golden = ''): DayData => ({
  hours,
  goldenGoal: { text: golden, done: false, tag: '' },
  priorities: { q1: [], q2: [], q3: [], q4: [] }
});

describe('wrap-up day boundary (05:00)', () => {
  it('reviews yesterday when opened after the boundary', () => {
    expect(getWrapUpDayKey(new Date('2026-11-20T05:00:00'))).toBe('2026-11-19');
    expect(getWrapUpDayKey(new Date('2026-11-20T21:30:00'))).toBe('2026-11-19');
  });

  it('rolls the month back correctly', () => {
    expect(getWrapUpDayKey(new Date('2026-12-01T06:00:00'))).toBe('2026-11-30');
    expect(getWrapUpDayKey(new Date('2026-01-01T05:00:00'))).toBe('2025-12-31');
  });

  it('uses a per-reviewed-day seen key', () => {
    expect(getWrapUpSeenKey('2026-11-19')).toBe('evening_wrap_up_seen_2026-11-19');
    expect(WRAP_UP_START_HOUR).toBe(5);
  });
});

describe('shouldOfferEveningWrapUp', () => {
  const base = { enabled: true, hasData: true, alreadySeen: false };

  it('offers exactly from 05:00, not a minute earlier', () => {
    expect(shouldOfferEveningWrapUp({ ...base, now: new Date('2026-11-20T04:59:00') })).toBe(false);
    expect(shouldOfferEveningWrapUp({ ...base, now: new Date('2026-11-20T05:00:00') })).toBe(true);
    expect(shouldOfferEveningWrapUp({ ...base, now: new Date('2026-11-20T23:59:00') })).toBe(true);
  });

  it('respects the toggle, empty days and already-seen days', () => {
    expect(shouldOfferEveningWrapUp({ ...base, enabled: false, now: new Date('2026-11-20T09:00:00') })).toBe(false);
    expect(shouldOfferEveningWrapUp({ ...base, hasData: false, now: new Date('2026-11-20T09:00:00') })).toBe(false);
    expect(shouldOfferEveningWrapUp({ ...base, alreadySeen: true, now: new Date('2026-11-20T09:00:00') })).toBe(false);
  });
});

describe('buildWrapUpSummary', () => {
  const day = makeDay(
    {
      '9am': { text: 'Social media', tag: 'V' },
      '10am': { text: 'Social media', tag: 'V' },
      '11am': { text: 'Client call', tag: 'E' },
      '12pm': { text: '', tag: '' },
      '1pm': { text: 'Gym', tag: 'S' }
    },
    'Ship the decompostion'
  );

  it('counts logged hours, tags and untagged entries', () => {
    const s = buildWrapUpSummary(day, targets, 16);
    expect(s.totalLogged).toBe(4);
    expect(s.tagCounts.V).toBe(2);
    expect(s.tagCounts.E).toBe(1);
    expect(s.tagCounts.S).toBe(1);
    expect(s.untagged).toBe(0);
    expect(s.coverage).toBeCloseTo(4 / 16);
    expect(s.goldenGoal).toBe('Ship the decompostion');
  });

  it('ranks the most repeated activities', () => {
    const s = buildWrapUpSummary(day, targets, 16);
    expect(s.topActivities[0]).toMatchObject({ text: 'Social media', count: 2 });
    expect(s.topActivities).toHaveLength(3);
  });

  it('computes the strongest and weakest sides against the targets', () => {
    const s = buildWrapUpSummary(day, targets, 16);
    expect(s.strongestTag?.code).toBe('V');
    expect(s.weakestTag?.code).toBe('E'); // 6 target - 1 logged = 5 gap
    expect(s.balance.find((r) => r.code === 'V')?.ratio).toBe(1); // 2/2 capped
    expect(s.balance.find((r) => r.code === 'R')?.ratio).toBe(0);
  });

  it('handles empty and missing days without NaN', () => {
    const empty = buildWrapUpSummary(null, targets, 0);
    expect(empty.totalLogged).toBe(0);
    expect(empty.coverage).toBe(0);
    expect(empty.activeHours).toBe(1);
    expect(empty.topActivities).toHaveLength(0);
    expect(empty.strongestTag).toBeNull();
    expect(Number.isNaN(empty.coverage)).toBe(false);
  });
});
