/**
 * dayLookup.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Finds a single day inside the currently loaded week or any cached week in
 * localStorage. Shared by the Morning Nudge and the Evening Wrap-up so both
 * read yesterday the same way (including the week-boundary fallback).
 */

import type { DayData, WeekData } from '../types';
import { addDays, isoDate, mondayOf } from './dateUtils';

/** A day counts as "logged" when at least one hour has non-blank text. */
export function hasLoggedHours(day: DayData | null | undefined): boolean {
  if (!day || !day.hours) return false;
  return Object.values(day.hours).some((entry) => !!(entry && entry.text && entry.text.trim() !== ''));
}

/**
 * Looks up `dateStr` in the loaded week first, then in the cached week that
 * owns that date, then in every cached week (legacy/edge cases).
 *
 * Mirrors the previous inline logic: the loaded week entry is returned as a
 * last resort even when it has no logged hours, so callers can still show
 * "nothing was logged" states.
 */
export function findDayDataAcrossWeeks(
  dateStr: string,
  uid: string | null,
  currentWeekData?: WeekData | null
): DayData | null {
  const currentWeekEntry = currentWeekData?.days?.[dateStr] ?? null;
  if (hasLoggedHours(currentWeekEntry)) return currentWeekEntry;

  const date = new Date(`${dateStr}T00:00:00`);
  if (!isNaN(date.getTime())) {
    try {
      const mondayKey = isoDate(mondayOf(date));
      const userPrefix = uid ?? 'guest';
      const raw =
        localStorage.getItem(`time_log_week_${userPrefix}_${mondayKey}`) ||
        localStorage.getItem(`time_log_week_guest_${mondayKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.days?.[dateStr]) return parsed.days[dateStr] as DayData;
      }
    } catch { }

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith('time_log_week_')) continue;
        const itemRaw = localStorage.getItem(k);
        if (!itemRaw) continue;
        const itemParsed = JSON.parse(itemRaw);
        const entry = itemParsed?.days?.[dateStr] as DayData | undefined;
        if (entry && hasLoggedHours(entry)) return entry;
      }
    } catch { }
  }

  return currentWeekEntry;
}

/** ISO date of `daysBack` days before `from` (defaults to yesterday). */
export function dayBefore(from: Date, daysBack = 1): string {
  return isoDate(addDays(from, -daysBack));
}
