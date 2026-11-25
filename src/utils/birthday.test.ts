import { describe, expect, it } from 'vitest';
import { getBirthdayInfo, isBirthdayToday } from './birthday';

const now = new Date('2026-11-25T10:00:00');
const base = { showAgeBadge: true, ageDisplayOpt: 'years' as const, lang: 'en' as const };

describe('getBirthdayInfo', () => {
  it('returns nothing when the badge is off, no date, or display is none', () => {
    expect(getBirthdayInfo({ ...base, showAgeBadge: false, birthDate: '1990-01-01' }, now).ageDisplayValue).toBe('');
    expect(getBirthdayInfo({ ...base, birthDate: '' }, now).bdayBannerText).toBe('');
    expect(getBirthdayInfo({ ...base, ageDisplayOpt: 'none', birthDate: '1990-01-01' }, now).ageDisplayValue).toBe('');
    expect(getBirthdayInfo({ ...base, birthDate: 'not-a-date' }, now).ageDisplayValue).toBe('');
  });

  it('shows age in years (1 decimal) or days', () => {
    expect(getBirthdayInfo({ ...base, birthDate: '1996-05-25' }, now)).toMatchObject({ ageDisplayValue: '30.5', ageUnit: 'y' });
    const days = getBirthdayInfo({ ...base, ageDisplayOpt: 'days', birthDate: '2026-11-15', lang: 'ar' }, now);
    expect(days).toMatchObject({ ageDisplayValue: '10', ageUnit: 'يوم' });
  });

  it('greets on the day, counts down within a week, reminds within a month', () => {
    expect(getBirthdayInfo({ ...base, birthDate: '1990-11-25' }, now).bdayBannerText).toContain('Happy Birthday');
    expect(getBirthdayInfo({ ...base, birthDate: '1990-11-26' }, now).bdayBannerText).toContain('Only 1 day left');
    expect(getBirthdayInfo({ ...base, birthDate: '1990-12-01' }, now).bdayBannerText).toContain('Only 6 days left');
    expect(getBirthdayInfo({ ...base, birthDate: '1990-12-20' }, now).bdayBannerText).toContain('25 days left');
    expect(getBirthdayInfo({ ...base, birthDate: '1990-03-01' }, now).bdayBannerText).toBe('');
  });

  it('wraps to next year for a birthday earlier this year', () => {
    expect(getBirthdayInfo({ ...base, birthDate: '1990-11-24' }, now).bdayBannerText).toBe('');
  });
});

describe('isBirthdayToday', () => {
  it('matches month and day only', () => {
    expect(isBirthdayToday('1990-11-25', now)).toBe(true);
    expect(isBirthdayToday('1990-11-24', now)).toBe(false);
    expect(isBirthdayToday('', now)).toBe(false);
  });
});
