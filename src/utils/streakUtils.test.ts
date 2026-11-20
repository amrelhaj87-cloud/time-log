import { describe, it, expect, vi, afterEach } from 'vitest';
import { calculateDailyStreak } from './streakUtils';

function hour(text: string) {
  return { text, tag: '' as const };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('calculateDailyStreak', () => {
  it('counts consecutive logged days ending today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 20, 10, 0, 0));

    const hours = {
      '2026-11-20': { '10am': hour('a') },
      '2026-11-19': { '9am': hour('b') },
      '2026-11-18': { '8am': hour('c') },
      '2026-11-17': { '7am': hour('') }
    };

    const result = calculateDailyStreak(hours);
    expect(result.hasToday).toBe(true);
    expect(result.streak).toBe(3);
  });

  it('preserves the streak from yesterday when today is empty', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 20, 10, 0, 0));

    const hours = {
      '2026-11-19': { '9am': hour('b') },
      '2026-11-18': { '8am': hour('c') }
    };

    const result = calculateDailyStreak(hours);
    expect(result.hasToday).toBe(false);
    expect(result.streak).toBe(2);
  });

  it('counts a completed golden goal as an active day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 20, 10, 0, 0));

    const golden = {
      '2026-11-20': { text: 'the one thing', done: true, tag: '' as const }
    };

    const result = calculateDailyStreak({}, golden);
    expect(result.hasToday).toBe(true);
    expect(result.streak).toBe(1);
  });
});
