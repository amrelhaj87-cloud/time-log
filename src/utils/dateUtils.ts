import { DayData, HourEntry, GoalItem, WeekData, WeekStartDay } from '../types';
import { HOURS_LIST } from '../constants/config';

export function startOfWeekFor(d: Date, startDay: WeekStartDay = 'saturday'): Date {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  const day = dt.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Target day index: Saturday=6, Sunday=0, Monday=1
  let targetIndex = 6;
  if (startDay === 'sunday') targetIndex = 0;
  if (startDay === 'monday') targetIndex = 1;

  let diff = (day - targetIndex + 7) % 7;
  dt.setDate(dt.getDate() - diff);
  return dt;
}

export function mondayOf(d: Date): Date {
  return startOfWeekFor(d, 'monday');
}

export function isoDate(d: Date): string {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function emptyDay(): DayData {
  const hours: Record<string, HourEntry> = {};
  HOURS_LIST.forEach((k) => {
    hours[k] = { text: '', tag: '' };
  });
  return {
    hours,
    goldenGoal: { text: '', done: false, tag: '' },
    priorities: {
      q1: [{ text: '', done: false, tag: '' }],
      q2: [{ text: '', done: false, tag: '' }],
      q3: [{ text: '', done: false, tag: '' }],
      q4: [{ text: '', done: false, tag: '' }]
    }
  };
}

/**
 * Normalizes loaded day data to guarantee all expected properties exist without breaking.
 */
export function normalizeDayData(rawDay: any): DayData {
  const base = emptyDay();
  if (!rawDay || typeof rawDay !== 'object') return base;

  // 1. Normalize hours
  const normalizedHours: Record<string, HourEntry> = {};
  HOURS_LIST.forEach((k) => {
    const rawEntry = rawDay.hours?.[k];
    if (rawEntry && typeof rawEntry === 'object') {
      normalizedHours[k] = {
        text: typeof rawEntry.text === 'string' ? rawEntry.text : '',
        tag: (rawEntry.tag || '') as any
      };
    } else {
      normalizedHours[k] = { text: '', tag: '' };
    }
  });

  // 2. Normalize golden goal
  const goldenGoal: GoalItem = {
    text: typeof rawDay.goldenGoal?.text === 'string' ? rawDay.goldenGoal.text : '',
    done: !!rawDay.goldenGoal?.done,
    tag: (rawDay.goldenGoal?.tag || '') as any
  };

  // 3. Normalize priorities matrix
  const normalizePriorityList = (list: any): GoalItem[] => {
    if (!Array.isArray(list) || list.length === 0) {
      return [{ text: '', done: false, tag: '' }];
    }
    return list.map((item) => ({
      text: typeof item?.text === 'string' ? item.text : '',
      done: !!item?.done,
      tag: (item?.tag || '') as any
    }));
  };

  const priorities = {
    q1: normalizePriorityList(rawDay.priorities?.q1),
    q2: normalizePriorityList(rawDay.priorities?.q2),
    q3: normalizePriorityList(rawDay.priorities?.q3),
    q4: normalizePriorityList(rawDay.priorities?.q4)
  };

  return {
    hours: normalizedHours,
    goldenGoal,
    priorities
  };
}

/**
 * Normalizes full week data, populating missing days or legacy structures cleanly.
 */
export function normalizeWeekData(raw: any, ws: Date): WeekData {
  const days: Record<string, DayData> = {};
  const rawDays = raw?.days || {};

  // Guarantee all 7 days for the displayed week
  for (let i = 0; i < 7; i++) {
    const dStr = isoDate(addDays(ws, i));
    days[dStr] = normalizeDayData(rawDays[dStr]);
  }

  // Also retain any extra days already present in the raw data (e.g. from Monday-based week)
  Object.keys(rawDays).forEach((dk) => {
    if (!days[dk]) {
      days[dk] = normalizeDayData(rawDays[dk]);
    }
  });

  return { days };
}

export function getCurrentHourKey(): string {
  const h = new Date().getHours();
  if (h >= 5 && h <= 11) return `${h}am`;
  if (h === 12) return `12pm`;
  if (h >= 13 && h <= 23) return `${h - 12}pm`;
  if (h === 0) return `12am`;
  return `${h}am`;
}

/**
 * Dispatches an event to expand the relevant period and focus the current hour input.
 */
export function focusCurrentHourInput() {
  const currentKey = getCurrentHourKey();
  const evt = new CustomEvent('expand-and-focus-hour', { detail: { hourKey: currentKey } });
  window.dispatchEvent(evt);

  // Attempt focus immediately and with slight delay to ensure UI/tab animations complete
  const tryFocus = () => {
    const el = document.getElementById(`hour-input-${currentKey}`);
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  setTimeout(tryFocus, 60);
  setTimeout(tryFocus, 200);
}
