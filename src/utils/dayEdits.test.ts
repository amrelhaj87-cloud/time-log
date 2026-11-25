import { describe, expect, it } from 'vitest';
import { appendFocusSession, rolloverIncomplete } from './dayEdits';
import { emptyDay } from './dateUtils';

describe('appendFocusSession', () => {
  it('writes into an empty hour with the prefix and the given tag', () => {
    const h = appendFocusSession({}, [{ hourKey: '9am', minutes: 25 }], 'write', 'V');
    expect(h['9am']).toEqual({ text: '[🎯 25m] write', tag: 'V' });
  });

  it('appends after existing text and keeps the hour tag when none is given', () => {
    const h = appendFocusSession({ '9am': { text: 'email', tag: 'S' } }, [{ hourKey: '9am', minutes: 15 }], 'code', '');
    expect(h['9am']).toEqual({ text: 'email • [🎯 15m] code', tag: 'S' });
  });

  it('defaults to E when neither has a tag', () => {
    expect(appendFocusSession({}, [{ hourKey: '9am', minutes: 5 }], 'x', '')['9am'].tag).toBe('E');
  });

  it('updateTagOnly keeps existing text but still fills an empty hour', () => {
    const kept = appendFocusSession({ '9am': { text: 'email', tag: 'S' } }, [{ hourKey: '9am', minutes: 25 }], 'code', 'E', true);
    expect(kept['9am']).toEqual({ text: 'email', tag: 'E' });
    const filled = appendFocusSession({}, [{ hourKey: '9am', minutes: 25 }], 'code', 'E', true);
    expect(filled['9am'].text).toBe('[🎯 25m] code');
  });

  it('logs split blocks into several hours and does not mutate the input', () => {
    const input = { '9am': { text: '', tag: '' as const } };
    const h = appendFocusSession(input, [{ hourKey: '9am', minutes: 15 }, { hourKey: '10am', minutes: 10 }], 'deep work', 'E');
    expect(h['9am'].text).toBe('[🎯 15m] deep work');
    expect(h['10am'].text).toBe('[🎯 10m] deep work');
    expect(input['9am'].text).toBe('');
  });
});

describe('rolloverIncomplete', () => {
  it('moves the unfinished golden goal and quadrant items, skipping done and blank ones', () => {
    const today = emptyDay();
    today.goldenGoal = { text: ' Ship v5 ', done: false, tag: 'E' };
    today.priorities.q1 = [{ text: 'call', done: false, tag: 'S' }, { text: 'done one', done: true, tag: '' }, { text: '  ', done: false, tag: '' }];
    today.priorities.q3 = [{ text: 'read', done: false, tag: 'V' }];

    const { tomorrow, movedCount } = rolloverIncomplete(today, emptyDay());
    expect(movedCount).toBe(3);
    expect(tomorrow.goldenGoal).toEqual({ text: 'Ship v5', done: false, tag: 'E' });
    expect(tomorrow.priorities.q1).toEqual([{ text: 'call', done: false, tag: 'S' }]); // filled the blank slot
    expect(tomorrow.priorities.q3).toEqual([{ text: 'read', done: false, tag: 'V' }]);
  });

  it("sends today's golden goal to Q1 when tomorrow's is taken, and never duplicates", () => {
    const today = emptyDay();
    today.goldenGoal = { text: 'A', done: false, tag: '' };
    today.priorities.q2 = [{ text: 'B', done: false, tag: '' }];
    const tmr = emptyDay();
    tmr.goldenGoal = { text: 'Other', done: false, tag: '' };
    tmr.priorities.q2 = [{ text: 'B', done: false, tag: '' }];

    const first = rolloverIncomplete(today, tmr);
    expect(first.movedCount).toBe(1);
    expect(first.tomorrow.goldenGoal.text).toBe('Other');
    expect(first.tomorrow.priorities.q1.map((t) => t.text)).toEqual(['A']);

    const again = rolloverIncomplete(today, first.tomorrow);
    expect(again.movedCount).toBe(0);
  });

  it('does not mutate tomorrow', () => {
    const today = emptyDay();
    today.priorities.q4 = [{ text: 'x', done: false, tag: '' }];
    const tmr = emptyDay();
    rolloverIncomplete(today, tmr);
    expect(tmr.priorities.q4).toEqual([{ text: '', done: false, tag: '' }]);
  });
});
