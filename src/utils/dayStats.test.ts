import { describe, expect, it } from 'vitest';
import { computeDayStats } from './dayStats';
import { emptyDay } from './dateUtils';

describe('computeDayStats', () => {
  it('counts tags, unassigned and empty hours over active hours only', () => {
    const day = emptyDay();
    day.hours['9am'] = { text: 'work', tag: 'E' };
    day.hours['10am'] = { text: 'plan', tag: 'V' };
    day.hours['11am'] = { text: 'misc', tag: '' };
    day.hours['12pm'] = { text: '   ', tag: 'E' }; // whitespace = empty
    day.hours['3am'] = { text: 'asleep?', tag: 'R' }; // not an active hour here

    const s = computeDayStats(day, ['9am', '10am', '11am', '12pm', '1pm']);
    expect(s.activeLoggedCount).toBe(3);
    expect(s.tagCounts.E).toBe(1);
    expect(s.tagCounts.V).toBe(1);
    expect(s.tagCounts.R).toBe(0);
    expect(s.unassignedCount).toBe(1);
    expect(s.emptyHoursCount).toBe(2);
  });
});
