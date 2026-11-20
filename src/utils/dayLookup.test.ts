import { beforeEach, describe, expect, it } from 'vitest';
import { dayBefore, findDayDataAcrossWeeks, hasLoggedHours } from './dayLookup';
import type { DayData, WeekData } from '../types';

// Minimal localStorage stand-in (vitest runs in node here).
class MemoryStorage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return Array.from(this.map.keys())[i] ?? null;
  }
  getItem(k: string) {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

const dayWith = (text: string): DayData => ({
  hours: { '9am': { text, tag: 'E' } },
  goldenGoal: { text: '', done: false, tag: '' },
  priorities: { q1: [], q2: [], q3: [], q4: [] }
});

const emptyDayData: DayData = {
  hours: { '9am': { text: '   ', tag: '' } },
  goldenGoal: { text: '', done: false, tag: '' },
  priorities: { q1: [], q2: [], q3: [], q4: [] }
};

const weekOf = (dateStr: string, day: DayData): WeekData => ({ days: { [dateStr]: day } });

describe('hasLoggedHours', () => {
  it('ignores blank text', () => {
    expect(hasLoggedHours(null)).toBe(false);
    expect(hasLoggedHours(emptyDayData)).toBe(false);
    expect(hasLoggedHours(dayWith('Client call'))).toBe(true);
  });
});

describe('findDayDataAcrossWeeks', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = new MemoryStorage();
  });

  it('prefers the loaded week when the day has hours', () => {
    const loaded = weekOf('2026-11-19', dayWith('from loaded week'));
    expect(findDayDataAcrossWeeks('2026-11-19', null, loaded)?.hours['9am'].text).toBe('from loaded week');
  });

  it('falls back to the cached week that owns the date', () => {
    const cached = weekOf('2026-11-19', dayWith('from cache'));
    localStorage.setItem('time_log_week_guest_2026-11-16', JSON.stringify(cached));
    expect(findDayDataAcrossWeeks('2026-11-19', null, null)?.hours['9am'].text).toBe('from cache');
  });

  it('scans other cached weeks when the owner key is missing', () => {
    localStorage.setItem('time_log_week_guest_2026-11-09', JSON.stringify(weekOf('2026-11-19', dayWith('scanned'))));
    expect(findDayDataAcrossWeeks('2026-11-19', null, null)?.hours['9am'].text).toBe('scanned');
  });

  it('returns the loaded entry as a last resort, or null when absent', () => {
    const loaded = weekOf('2026-11-19', emptyDayData);
    expect(findDayDataAcrossWeeks('2026-11-19', null, loaded)).toBe(emptyDayData);
    expect(findDayDataAcrossWeeks('2026-11-18', null, loaded)).toBeNull();
  });

  it('uses the uid-scoped key when signed in', () => {
    localStorage.setItem('time_log_week_user-1_2026-11-16', JSON.stringify(weekOf('2026-11-18', dayWith('mine'))));
    localStorage.setItem('time_log_week_guest_2026-11-16', JSON.stringify(weekOf('2026-11-18', dayWith('guest'))));
    expect(findDayDataAcrossWeeks('2026-11-18', 'user-1', null)?.hours['9am'].text).toBe('mine');
  });

  it('survives malformed cached JSON', () => {
    localStorage.setItem('time_log_week_guest_2026-11-16', '{not json');
    expect(findDayDataAcrossWeeks('2026-11-19', null, null)).toBeNull();
  });
});

describe('dayBefore', () => {
  it('returns yesterday in ISO form', () => {
    expect(dayBefore(new Date('2026-11-20T05:00:00'))).toBe('2026-11-19');
    expect(dayBefore(new Date('2026-12-01T05:00:00'))).toBe('2026-11-30');
    expect(dayBefore(new Date('2026-11-20T05:00:00'), 2)).toBe('2026-11-18');
  });
});
