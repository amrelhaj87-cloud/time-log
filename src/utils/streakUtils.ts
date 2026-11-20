import { isoDate } from './dateUtils';
import { HourEntry, GoalItem } from '../types';

/**
 * Calculates the current active daily streak.
 * A day is considered logged / completed if:
 * - At least 1 active hour has been recorded OR
 * - Golden Goal is completed
 */
export function calculateDailyStreak(
  allDaysHours: Record<string, Record<string, HourEntry>>,
  allDaysGolden: Record<string, GoalItem> = {}
): { streak: number; hasToday: boolean } {
  const today = new Date();
  const todayKey = isoDate(today);

  // Check if today has activity
  const todayHours = allDaysHours[todayKey];
  const todayGolden = allDaysGolden[todayKey];
  const todayHoursCount = todayHours
    ? Object.values(todayHours).filter((h) => h && h.text && h.text.trim().length > 0).length
    : 0;
  const hasToday = todayHoursCount > 0 || !!(todayGolden && todayGolden.done);

  let streak = 0;
  const checkDate = new Date(today);

  // If today is not logged yet, start checking from yesterday to preserve existing streak
  if (!hasToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Iterate backwards day by day up to 365 days
  for (let i = 0; i < 365; i++) {
    const key = isoDate(checkDate);
    const dayHours = allDaysHours[key];
    const dayGolden = allDaysGolden[key];
    const count = dayHours
      ? Object.values(dayHours).filter((h) => h && h.text && h.text.trim().length > 0).length
      : 0;
    const isCompleted = count > 0 || !!(dayGolden && dayGolden.done);

    if (isCompleted) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return { streak, hasToday };
}
