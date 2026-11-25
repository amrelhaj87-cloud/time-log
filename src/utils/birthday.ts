import type { AgeDisplayOpt } from '../types';

export interface BirthdayInfo {
  /** Countdown / greeting banner text ('' when none is due). */
  bdayBannerText: string;
  /** Age shown in the header badge ('' when hidden). */
  ageDisplayValue: string;
  ageUnit: string;
}

const EMPTY: BirthdayInfo = { bdayBannerText: '', ageDisplayValue: '', ageUnit: '' };
const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Age badge + birthday reminder (on the day, within a week, within a month).
 * Only computed when the age badge is on and an age display is chosen.
 */
export function getBirthdayInfo(
  opts: { showAgeBadge: boolean; birthDate: string; ageDisplayOpt: AgeDisplayOpt; lang: 'ar' | 'en' },
  now: Date = new Date()
): BirthdayInfo {
  const { showAgeBadge, birthDate, ageDisplayOpt, lang } = opts;
  if (!showAgeBadge || !birthDate || ageDisplayOpt === 'none') return EMPTY;
  const birth = new Date(birthDate + 'T00:00:00');
  if (isNaN(birth.getTime())) return EMPTY;

  const info: BirthdayInfo = { ...EMPTY };
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (ageDisplayOpt === 'days' || ageDisplayOpt === 'years') {
    const diffMs = now.getTime() - birth.getTime();
    if (diffMs > 0) {
      if (ageDisplayOpt === 'days') {
        info.ageDisplayValue = Math.floor(diffMs / DAY_MS).toLocaleString('en-US');
        info.ageUnit = lang === 'ar' ? 'يوم' : 'd';
      } else {
        info.ageDisplayValue = (diffMs / (DAY_MS * 365.25)).toFixed(1);
        info.ageUnit = lang === 'ar' ? 'سنة' : 'y';
      }
    }
  }

  const nextBday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (nextBday < today) nextBday.setFullYear(today.getFullYear() + 1);
  const diffDays = Math.ceil((nextBday.getTime() - today.getTime()) / DAY_MS);

  if (diffDays === 0) {
    info.bdayBannerText =
      lang === 'ar'
        ? '🥳🎉 اليوم هو عيد ميلادك! كل عام وأنت بألف خير وإنجاز وتوفيق دائم وسعادة! 🎂✨'
        : '🥳🎉 Happy Birthday Today! Wishing you a fantastic year filled with success and joy! 🎂✨';
  } else if (diffDays <= 7) {
    info.bdayBannerText =
      lang === 'ar'
        ? diffDays === 1
          ? '🎂 تنبيه عيد الميلاد: متبقي يوم واحد فقط على عيد ميلادك! 🎉'
          : diffDays === 2
            ? '🎂 تنبيه عيد الميلاد: متبقي يومان فقط على عيد ميلادك! 🎉'
            : `🎂 تنبيه عيد الميلاد: متبقي على عيد ميلادك ${diffDays} أيام فقط! 🎉`
        : `🎂 Birthday Countdown: Only ${diffDays} day${diffDays === 1 ? '' : 's'} left until your birthday! 🎉`;
  } else if (diffDays <= 30) {
    info.bdayBannerText =
      lang === 'ar'
        ? `🎈 تذكير مبكر: متبقي قرابة شهر على عيد ميلادك (${diffDays} يوماً)! ✨`
        : `🎈 Early Reminder: Around 1 month until your birthday (${diffDays} days left)! ✨`;
  }
  return info;
}

/** True when today is the birthday (month + day), for the one-time confetti. */
export function isBirthdayToday(birthDate: string, now: Date = new Date()): boolean {
  if (!birthDate) return false;
  const birth = new Date(birthDate + 'T00:00:00');
  if (isNaN(birth.getTime())) return false;
  return now.getMonth() === birth.getMonth() && now.getDate() === birth.getDate();
}
