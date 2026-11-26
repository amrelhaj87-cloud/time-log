import type { DayData, GoalItem, TagCode } from '../types';

/**
 * Linking a Pomodoro session to a task (#48): an inbox idea, today's golden
 * goal, or a priority-matrix item. Each task can carry an optional time
 * estimate and accumulates the focus minutes logged against it.
 */

/** Quick estimate presets offered in the UI (minutes): 30m, 1h, 2h. */
export const ESTIMATE_PRESETS = [30, 60, 120];

/** Upper bound for an estimate or a running total (≈ 166 hours). */
const MAX_MINS = 10000;

export interface TaskTime {
  estimateMins?: number;
  spentMins?: number;
}

export type QuadKey = 'q1' | 'q2' | 'q3' | 'q4';

/** What the running Pomodoro is working on. */
export type FocusLink =
  | { kind: 'todo'; id: string; text: string; tag: TagCode }
  | { kind: 'golden'; date: string; text: string; tag: TagCode }
  | { kind: 'quad'; date: string; quad: QuadKey; idx: number; text: string; tag: TagCode };

function cleanMins(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  const n = Math.round(v);
  if (n <= 0) return undefined;
  return Math.min(n, MAX_MINS);
}

/** Reads valid estimate/spent fields from stored data (drops anything invalid). */
export function readTaskTime(raw: unknown): TaskTime {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: TaskTime = {};
  const estimate = cleanMins(r.estimateMins);
  const spent = cleanMins(r.spentMins);
  if (estimate !== undefined) out.estimateMins = estimate;
  if (spent !== undefined) out.spentMins = spent;
  return out;
}

/** Returns a copy with the estimate set (or removed when `mins` is undefined/invalid). */
export function withEstimate<T extends TaskTime>(item: T, mins: number | undefined): T {
  const next = { ...item };
  const clean = cleanMins(mins);
  if (clean === undefined) delete next.estimateMins;
  else next.estimateMins = clean;
  return next;
}

/** Returns a copy with `minutes` added to the time spent. */
export function addSpent<T extends TaskTime>(item: T, minutes: number): T {
  const add = cleanMins(minutes) ?? 0;
  const total = Math.min((item.spentMins ?? 0) + add, MAX_MINS);
  return total > 0 ? { ...item, spentMins: total } : { ...item };
}

/** Progress as a whole percent (may exceed 100), or null without an estimate. */
export function progressPct(spentMins: number | undefined, estimateMins: number | undefined): number | null {
  if (!estimateMins || estimateMins <= 0) return null;
  return Math.round(((spentMins ?? 0) / estimateMins) * 100);
}

/** "45د" / "1س" / "1س 30د" (ar) or "45m" / "1h" / "1h 30m" (en). */
export function formatMins(mins: number, lang: 'ar' | 'en'): string {
  const m = Math.max(0, Math.round(mins));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  const H = lang === 'ar' ? 'س' : 'h';
  const M = lang === 'ar' ? 'د' : 'm';
  if (h === 0) return `${rest}${M}`;
  if (rest === 0) return `${h}${H}`;
  return `${h}${H} ${rest}${M}`;
}

const sameText = (a: string, b: string) => a.trim() === b.trim();

/** Finds the linked goal in a day (by index first, then by text). */
export function findLinkedGoal(day: DayData, link: FocusLink): GoalItem | null {
  if (link.kind === 'golden') {
    return sameText(day.goldenGoal.text, link.text) && link.text.trim() !== '' ? day.goldenGoal : null;
  }
  if (link.kind === 'quad') {
    const list = day.priorities[link.quad] || [];
    const atIdx = list[link.idx];
    if (atIdx && sameText(atIdx.text, link.text)) return atIdx;
    return list.find((g) => link.text.trim() !== '' && sameText(g.text, link.text)) ?? null;
  }
  return null;
}

/**
 * Applies a finished session to the linked goal in `day`: adds the minutes
 * and, when `finished`, marks it done. Returns the new day and whether the
 * goal was found (if not, the day is returned unchanged).
 */
export function creditGoalInDay(
  day: DayData,
  link: FocusLink,
  update: (g: GoalItem) => GoalItem
): { day: DayData; found: boolean } {
  if (link.kind === 'golden') {
    if (!findLinkedGoal(day, link)) return { day, found: false };
    return { day: { ...day, goldenGoal: update(day.goldenGoal) }, found: true };
  }
  if (link.kind === 'quad') {
    const list = day.priorities[link.quad] || [];
    let idx = list[link.idx] && sameText(list[link.idx].text, link.text) ? link.idx : -1;
    if (idx === -1 && link.text.trim() !== '') idx = list.findIndex((g) => sameText(g.text, link.text));
    if (idx === -1) return { day, found: false };
    const nextList = list.map((g, i) => (i === idx ? update(g) : g));
    return { day: { ...day, priorities: { ...day.priorities, [link.quad]: nextList } }, found: true };
  }
  return { day, found: false };
}

/** The update a finished session applies to a task: add minutes, maybe mark done. */
export function sessionUpdate<T extends TaskTime & { done: boolean }>(minutes: number, finished: boolean) {
  return (item: T): T => {
    const next = addSpent(item, minutes);
    return finished ? { ...next, done: true } : next;
  };
}
