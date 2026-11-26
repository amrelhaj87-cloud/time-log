import type React from 'react';
import type { User } from 'firebase/auth';
import type { DayData, HourEntry, TagCode, WeekData, WeekStartDay } from '../types';
import {
  emptyDay,
  getCurrentHourKey,
  isoDate,
  mondayOf,
  normalizeWeekData,
  startOfWeekFor,
  type PomodoroSplit
} from '../utils/dateUtils';
import { appendFocusSession, type FocusBlock } from '../utils/dayEdits';

interface Deps {
  setWeekData: React.Dispatch<React.SetStateAction<WeekData>>;
  saveWeekData: (updated: WeekData, ws: Date, user: User | null, immediate?: boolean) => void;
  weekStart: Date;
  weekStartDay: WeekStartDay;
  currentUser: User | null;
  lang: 'ar' | 'en';
  setSaveStatus: (s: string) => void;
}

/**
 * Logging finished Pomodoro sessions into the hour log (extracted from App.tsx).
 *
 * A session is always logged to TODAY (the real date), even when the user is
 * browsing another day (#05). If today isn't in the loaded week, it is written
 * to today's week in the background (localStorage + cloud) without switching.
 */
export function usePomodoroLogging({
  setWeekData,
  saveWeekData,
  weekStart,
  weekStartDay,
  currentUser,
  lang,
  setSaveStatus
}: Deps) {
  /**
   * Updates one day (by date) wherever it lives: in the loaded week if it's
   * there, otherwise in that day's own week in the background (localStorage +
   * cloud) without switching what's on screen.
   */
  const updateDayOn = (dateStr: string, update: (day: DayData) => DayData) => {
    setWeekData((prevWeek) => {
      const loadedDay = prevWeek.days[dateStr];
      if (loadedDay) {
        const newWeek: WeekData = { ...prevWeek, days: { ...prevWeek.days, [dateStr]: update(loadedDay) } };
        saveWeekData(newWeek, weekStart, currentUser, true);
        return newWeek;
      }

      const [y, m, d] = dateStr.split('-').map(Number);
      const targetWs = startOfWeekFor(new Date(y, m - 1, d), weekStartDay);
      const localKey = `time_log_week_${currentUser ? currentUser.uid : 'guest'}_${isoDate(mondayOf(targetWs))}`;
      let targetWeek: WeekData = { days: {} };
      const raw = localStorage.getItem(localKey);
      if (raw) {
        try {
          targetWeek = JSON.parse(raw);
        } catch {
          /* corrupt cache — start from an empty week */
        }
      }
      targetWeek = normalizeWeekData(targetWeek, targetWs);
      const existingDay = targetWeek.days[dateStr] || emptyDay();
      targetWeek.days[dateStr] = update(existingDay);
      saveWeekData(targetWeek, targetWs, currentUser, true);
      return prevWeek;
    });
  };

  const logToToday = (update: (hours: Record<string, HourEntry>) => Record<string, HourEntry>) => {
    updateDayOn(isoDate(new Date()), (day) => ({ ...day, hours: update(day.hours) }));
  };

  const flash = (message: string, ms: number) => {
    setSaveStatus(message);
    setTimeout(() => setSaveStatus(''), ms);
  };

  /** Logs a whole session into the current hour. */
  const handleLogPomodoroToCurrentHour = (text: string, minutes: number, tag: TagCode, updateTagOnly = false) => {
    const currentKey = getCurrentHourKey();
    logToToday((hours) => appendFocusSession(hours, [{ hourKey: currentKey, minutes }], text, tag, updateTagOnly));
    flash(
      lang === 'ar'
        ? `✅ تم تسجيل ${minutes} دقيقة تركيز في تاريخ اليوم (${currentKey})`
        : `✅ Logged ${minutes}m focus session to today (${currentKey})`,
      3000
    );
  };

  /** Logs a session that spanned several hours, split into 15-minute blocks (Fix 3). */
  const handleLogPomodoroSplits = (text: string, splits: PomodoroSplit[], tag: TagCode) => {
    if (!splits || splits.length === 0) return;
    const blocks: FocusBlock[] = splits.map((s) => ({ hourKey: s.hourKey, minutes: s.minutes }));
    logToToday((hours) => appendFocusSession(hours, blocks, text, tag));
    const summaryStr = splits
      .map((s) => (lang === 'ar' ? `${s.minutes}د في (${s.hourKey})` : `${s.minutes}m @ ${s.hourKey}`))
      .join(lang === 'ar' ? ' و ' : ' + ');
    flash(lang === 'ar' ? `✅ تم تسجيل جلسة تركيز: ${summaryStr}` : `✅ Logged focus session: ${summaryStr}`, 4000);
  };

  return { handleLogPomodoroToCurrentHour, handleLogPomodoroSplits, updateDayOn };
}
