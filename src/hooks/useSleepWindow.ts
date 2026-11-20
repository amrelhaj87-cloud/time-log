import { useCallback, useEffect, useState } from 'react';
import { HOURS_LIST, HOUR_TO_24 } from '../constants/config';
import type { SleepSettings } from '../types';

/**
 * Sleep window state: the enabled range, per-day exceptions, and the derived
 * sleep/active hour keys. Extracted from App.tsx (step 2 of the decomposition).
 */
export function useSleepWindow() {
  const [sleepSettings, setSleepSettings] = useState<SleepSettings>(() => {
    const saved = localStorage.getItem('sleepSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      enabled: true,
      start: 23, // 11pm
      end: 7,    // 7am
      onboarded: true
    };
  });

  const [sleepExceptionDays, setSleepExceptionDays] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('sleepExceptionDays') || '{}');
    } catch {
      return {};
    }
  });

  const getSleepHourKeys = useCallback(() => {
    if (!sleepSettings.enabled) return [] as string[];
    const { start, end } = sleepSettings;
    return HOURS_LIST.filter((k) => {
      const h = HOUR_TO_24[k];
      if (h === undefined) return false;
      if (start < end) {
        return h >= start && h < end;
      } else if (start > end) {
        return h >= start || h < end;
      }
      return false;
    });
  }, [sleepSettings]);

  const sleepHourKeys = getSleepHourKeys();
  const activeHoursKeys = HOURS_LIST.filter((k) => !sleepHourKeys.includes(k));

  // Sleep settings are managed through the Settings Modal; never auto-popup.
  useEffect(() => {
    if (!sleepSettings.onboarded) {
      setSleepSettings((prev) => ({ ...prev, onboarded: true }));
      localStorage.setItem('sleepSettings', JSON.stringify({ ...sleepSettings, onboarded: true }));
    }
  }, [sleepSettings]);

  return {
    sleepSettings,
    setSleepSettings,
    sleepExceptionDays,
    setSleepExceptionDays,
    sleepHourKeys,
    activeHoursKeys
  };
}
