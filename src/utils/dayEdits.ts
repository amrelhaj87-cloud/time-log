import type { DayData, GoalItem, HourEntry, TagCode } from '../types';

/** One block of a focus session to log: which hour, and how many minutes of it. */
export interface FocusBlock {
  hourKey: string;
  minutes: number;
}

/**
 * Appends a Pomodoro session to the given hours (returns a new hours object).
 * Each block is written as "[🎯 25m] task", joined with " • " after any text
 * already in that hour. The block's tag wins; otherwise the hour keeps its tag,
 * defaulting to E.
 *
 * `updateTagOnly` (single-block logging only): when the hour already has text,
 * keep the text and only update the tag.
 */
export function appendFocusSession(
  hours: Record<string, HourEntry>,
  blocks: FocusBlock[],
  text: string,
  tag: TagCode,
  updateTagOnly = false
): Record<string, HourEntry> {
  const next = { ...hours };
  for (const { hourKey, minutes } of blocks) {
    const prefix = `[🎯 ${minutes}m] `;
    const existing = next[hourKey] || { text: '', tag: '' };
    const hasText = existing.text.trim() !== '';
    const updatedText = updateTagOnly
      ? hasText
        ? existing.text
        : `${prefix}${text}`
      : hasText
        ? `${existing.text} • ${prefix}${text}`
        : `${prefix}${text}`;
    next[hourKey] = { text: updatedText, tag: tag || (existing.tag as TagCode) || 'E' };
  }
  return next;
}

const isFilled = (g: GoalItem) => !!g.text && g.text.trim() !== '';
const isBlankSlot = (g: GoalItem) => (!g.text || g.text.trim() === '') && !g.done;

/** Puts `item` in the first blank slot of `list`, or appends it. */
function placeInList(list: GoalItem[], item: GoalItem): void {
  const emptyIdx = list.findIndex(isBlankSlot);
  if (emptyIdx !== -1) list[emptyIdx] = item;
  else list.push(item);
}

/**
 * "Roll over to tomorrow": copies today's unfinished golden goal and unfinished
 * Q1–Q4 items into tomorrow, skipping anything tomorrow already has. If
 * tomorrow's golden goal is taken by something else, today's goes to Q1.
 * Returns a new tomorrow (inputs are not mutated) and how many items moved.
 */
export function rolloverIncomplete(today: DayData, tomorrow: DayData): { tomorrow: DayData; movedCount: number } {
  const next: DayData = {
    ...tomorrow,
    goldenGoal: { ...tomorrow.goldenGoal },
    priorities: {
      q1: [...(tomorrow.priorities.q1 || [])],
      q2: [...(tomorrow.priorities.q2 || [])],
      q3: [...(tomorrow.priorities.q3 || [])],
      q4: [...(tomorrow.priorities.q4 || [])]
    }
  };
  let movedCount = 0;

  // 1. Unfinished golden goal
  const golden = today.goldenGoal;
  if (golden && isFilled(golden) && !golden.done) {
    const cleanGolden = golden.text.trim();
    if (!isFilled(next.goldenGoal)) {
      next.goldenGoal = { text: cleanGolden, done: false, tag: golden.tag || '' };
      movedCount++;
    } else if (next.goldenGoal.text.trim() !== cleanGolden) {
      if (!next.priorities.q1.some((t) => t.text.trim() === cleanGolden)) {
        placeInList(next.priorities.q1, { text: cleanGolden, done: false, tag: golden.tag || '' });
        movedCount++;
      }
    }
  }

  // 2. Unfinished items from the four priority quadrants
  for (const q of ['q1', 'q2', 'q3', 'q4'] as const) {
    const list = next.priorities[q];
    for (const item of today.priorities[q] || []) {
      if (!isFilled(item) || item.done) continue;
      const cleanText = item.text.trim();
      if (list.some((t) => t.text.trim() === cleanText)) continue;
      placeInList(list, { text: cleanText, done: false, tag: item.tag || '' });
      movedCount++;
    }
    if (list.length === 0) next.priorities[q] = [{ text: '', done: false, tag: '' }];
  }

  return { tomorrow: next, movedCount };
}
