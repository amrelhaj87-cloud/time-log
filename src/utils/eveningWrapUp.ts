/**
 * eveningWrapUp.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * "حصاد المساء" (Evening Wrap-up) — a light review of the day that just ended.
 *
 * TIMING MODEL (#09):
 *   The wrap-up day boundary is 05:00. From 05:00 onwards the previous calendar
 *   day is considered finished, so the wrap-up is offered once, on the first app
 *   open at/after 05:00, and it reviews *yesterday*.
 *
 *   Why 05:00: late-night logging still belongs to the day the user is living,
 *   and offering a "wrap-up" at 23:00 would interrupt exactly the hours that
 *   still need logging. 05:00 is the requested quiet boundary.
 */

import type { DayData, TagCode, TagTargets } from '../types';

export const WRAP_UP_START_HOUR = 5;
export const WRAP_UP_SEEN_PREFIX = 'evening_wrap_up_seen_';

/** The calendar day the wrap-up reviews (yesterday). */
export function getWrapUpDayKey(now: Date): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function getWrapUpSeenKey(dayKey: string): string {
  return `${WRAP_UP_SEEN_PREFIX}${dayKey}`;
}

export interface WrapUpOfferInput {
  enabled: boolean;
  now: Date;
  /** The reviewed day has at least one logged hour. */
  hasData: boolean;
  /** The user already dismissed the wrap-up for that day. */
  alreadySeen: boolean;
}

/** Pure decision so the 05:00 boundary is unit-testable. */
export function shouldOfferEveningWrapUp({ enabled, now, hasData, alreadySeen }: WrapUpOfferInput): boolean {
  if (!enabled || !hasData || alreadySeen) return false;
  return now.getHours() >= WRAP_UP_START_HOUR;
}

export interface WrapUpBalanceRow {
  code: 'E' | 'V' | 'R' | 'S' | 'SC';
  logged: number;
  target: number;
  ratio: number; // 0..1
}

export interface WrapUpTopActivity {
  text: string;
  count: number;
  tag: TagCode;
}

export interface WrapUpSummary {
  totalLogged: number;
  activeHours: number;
  coverage: number; // 0..1 of the active hours
  tagCounts: Record<TagCode, number>;
  untagged: number;
  balance: WrapUpBalanceRow[];
  topActivities: WrapUpTopActivity[];
  goldenGoal: string;
  goldenDone: boolean;
  strongestTag: WrapUpBalanceRow | null;
  weakestTag: WrapUpBalanceRow | null;
}

const TRACKED: Array<'E' | 'V' | 'R' | 'S' | 'SC'> = ['E', 'V', 'R', 'S', 'SC'];

export function buildWrapUpSummary(
  day: DayData | null | undefined,
  tagTargets: TagTargets,
  activeHours: number
): WrapUpSummary {
  const tagCounts: Record<TagCode, number> = { E: 0, V: 0, R: 0, S: 0, SC: 0, SL: 0, '': 0 };
  const activityMap = new Map<string, WrapUpTopActivity>();

  let totalLogged = 0;
  let untagged = 0;

  const hours = day?.hours || {};
  for (const entry of Object.values(hours)) {
    if (!entry || !entry.text || !entry.text.trim()) continue;
    totalLogged++;

    const tag = (entry.tag || '') as TagCode;
    if (tag && tagCounts[tag] !== undefined) tagCounts[tag]++;
    else untagged++;

    const text = entry.text.trim();
    const key = text.toLowerCase();
    const existing = activityMap.get(key);
    if (existing) existing.count++;
    else activityMap.set(key, { text, count: 1, tag });
  }

  const balance: WrapUpBalanceRow[] = TRACKED.map((code) => {
    const target = tagTargets?.[code] ?? 2;
    const logged = tagCounts[code] || 0;
    return {
      code,
      logged,
      target,
      ratio: target > 0 ? Math.min(1, logged / target) : 0
    };
  });

  // "Strongest" only counts tags with real hours; "weakest" only tags with a gap.
  const withHours = balance.filter((row) => row.logged > 0);
  const strongestTag = withHours.length
    ? withHours.reduce((best, row) => (row.logged > best.logged ? row : best))
    : null;
  const withGap = balance.filter((row) => row.logged < row.target);
  const weakestTag = withGap.length
    ? withGap.reduce((worst, row) => (row.target - row.logged > worst.target - worst.logged ? row : worst))
    : null;

  const topActivities = Array.from(activityMap.values())
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, 'ar'))
    .slice(0, 3);

  const safeActive = Math.max(1, activeHours);

  return {
    totalLogged,
    activeHours: safeActive,
    coverage: Math.min(1, totalLogged / safeActive),
    tagCounts,
    untagged,
    balance,
    topActivities,
    goldenGoal: day?.goldenGoal?.text?.trim() || '',
    goldenDone: !!day?.goldenGoal?.done,
    strongestTag,
    weakestTag
  };
}
