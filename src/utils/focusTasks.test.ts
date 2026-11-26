import { describe, expect, it } from 'vitest';
import {
  addSpent,
  creditGoalInDay,
  findLinkedGoal,
  formatMins,
  progressPct,
  readTaskTime,
  sessionUpdate,
  withEstimate,
  type FocusLink
} from './focusTasks';
import { emptyDay, normalizeDayData } from './dateUtils';
import { rolloverIncomplete } from './dayEdits';
import type { DayData } from '../types';

describe('task time helpers (#48)', () => {
  it('formats minutes in Arabic and English', () => {
    expect(formatMins(45, 'ar')).toBe('45د');
    expect(formatMins(60, 'ar')).toBe('1س');
    expect(formatMins(90, 'en')).toBe('1h 30m');
  });

  it('computes progress, allowing more than 100%, null without estimate', () => {
    expect(progressPct(45, 120)).toBe(38);
    expect(progressPct(150, 120)).toBe(125);
    expect(progressPct(30, undefined)).toBeNull();
  });

  it('adds spent minutes and sets / clears the estimate', () => {
    const a = addSpent<{ done: boolean; spentMins?: number; estimateMins?: number }>({ done: false }, 25);
    expect(a.spentMins).toBe(25);
    expect(addSpent(a, 20).spentMins).toBe(45);
    expect(withEstimate(a, 60).estimateMins).toBe(60);
    expect('estimateMins' in withEstimate({ estimateMins: 60 }, undefined)).toBe(false);
  });

  it('reads only valid stored fields', () => {
    expect(readTaskTime({ estimateMins: 120, spentMins: 30 })).toEqual({ estimateMins: 120, spentMins: 30 });
    expect(readTaskTime({ estimateMins: -5, spentMins: 'x' })).toEqual({});
    expect(readTaskTime(null)).toEqual({});
  });

  it('a finished session adds minutes and strikes the task', () => {
    const done = sessionUpdate(25, true)({ done: false, spentMins: 20 });
    expect(done).toEqual({ done: true, spentMins: 45 });
    expect(sessionUpdate(25, false)({ done: false }).done).toBe(false);
  });
});

function dayWith(): DayData {
  const d = emptyDay();
  d.goldenGoal = { text: 'Write report', done: false, tag: 'E', estimateMins: 120 };
  d.priorities.q2 = [
    { text: 'Read', done: false, tag: 'V' },
    { text: 'Gym', done: false, tag: 'S', spentMins: 10 }
  ];
  return d;
}

describe('crediting a linked goal', () => {
  const golden: FocusLink = { kind: 'golden', date: '2026-11-26', text: 'Write report', tag: 'E' };

  it('credits the golden goal and marks it done when finished', () => {
    const { day, found } = creditGoalInDay(dayWith(), golden, sessionUpdate(45, true));
    expect(found).toBe(true);
    expect(day.goldenGoal).toMatchObject({ spentMins: 45, done: true, estimateMins: 120 });
  });

  it('credits a quad item by index, or by text if it moved', () => {
    const byIdx: FocusLink = { kind: 'quad', date: '2026-11-26', quad: 'q2', idx: 1, text: 'Gym', tag: 'S' };
    expect(creditGoalInDay(dayWith(), byIdx, sessionUpdate(25, false)).day.priorities.q2[1].spentMins).toBe(35);
    const moved: FocusLink = { ...byIdx, idx: 0 };
    expect(creditGoalInDay(dayWith(), moved, sessionUpdate(25, false)).day.priorities.q2[1].spentMins).toBe(35);
  });

  it('reports not found when the goal was renamed or removed', () => {
    const gone: FocusLink = { ...golden, text: 'Something else' };
    const res = creditGoalInDay(dayWith(), gone, sessionUpdate(25, true));
    expect(res.found).toBe(false);
    expect(findLinkedGoal(dayWith(), gone)).toBeNull();
  });
});

describe('time fields survive load and rollover', () => {
  it('normalizeDayData keeps estimate / spent', () => {
    const d = normalizeDayData(JSON.parse(JSON.stringify(dayWith())));
    expect(d.goldenGoal.estimateMins).toBe(120);
    expect(d.priorities.q2[1].spentMins).toBe(10);
  });

  it('rollover carries the time to tomorrow', () => {
    const { tomorrow } = rolloverIncomplete(dayWith(), emptyDay());
    expect(tomorrow.goldenGoal.estimateMins).toBe(120);
    expect(tomorrow.priorities.q2.find((g) => g.text === 'Gym')?.spentMins).toBe(10);
  });
});
