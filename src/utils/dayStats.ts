import type { DayData, TagCode, WeekData } from '../types';

export interface DayStats {
  tagCounts: Record<TagCode, number>;
  /** Active (non-sleep) hours that have text. */
  activeLoggedCount: number;
  /** Logged hours with no (or an unknown) tag. */
  unassignedCount: number;
  /** Active hours with no text. */
  emptyHoursCount: number;
}

/** Tag counts and logged/empty totals for one day, over its active hours only. */
export function computeDayStats(day: DayData, activeHoursKeys: string[]): DayStats {
  const tagCounts: Record<TagCode, number> = { E: 0, V: 0, R: 0, S: 0, SC: 0, SL: 0, '': 0 };
  let activeLoggedCount = 0;
  let unassignedCount = 0;
  let emptyHoursCount = 0;

  for (const key of activeHoursKeys) {
    const entry = day.hours[key];
    if (entry && entry.text && entry.text.trim() !== '') {
      activeLoggedCount++;
      if (entry.tag && tagCounts[entry.tag] !== undefined) {
        tagCounts[entry.tag]++;
      } else {
        unassignedCount++;
      }
    } else {
      emptyHoursCount++;
    }
  }
  return { tagCounts, activeLoggedCount, unassignedCount, emptyHoursCount };
}

/**
 * Every known day's hours and golden goal, for the streak (which spans weeks):
 * the loaded week first, then every week cached in localStorage. The loaded
 * week's cache is rewritten on every edit, so where they overlap they agree.
 */
export function collectAllDays(weekData: WeekData): {
  allDaysHours: Record<string, DayData['hours']>;
  allDaysGolden: Record<string, DayData['goldenGoal']>;
} {
  const allDaysHours: Record<string, DayData['hours']> = {};
  const allDaysGolden: Record<string, DayData['goldenGoal']> = {};
  for (const dk of Object.keys(weekData.days)) {
    allDaysHours[dk] = weekData.days[dk].hours;
    allDaysGolden[dk] = weekData.days[dk].goldenGoal;
  }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('time_log_week_')) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.days) {
        for (const dk of Object.keys(parsed.days)) {
          allDaysHours[dk] = parsed.days[dk].hours;
          allDaysGolden[dk] = parsed.days[dk].goldenGoal;
        }
      }
    }
  } catch {
    /* corrupt cache entry — the streak just uses what was read */
  }
  return { allDaysHours, allDaysGolden };
}
