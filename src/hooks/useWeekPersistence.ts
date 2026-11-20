import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { db, doc, getDoc, setDoc } from '../services/firebase';
import { STRINGS } from '../constants/config';
import { addDays, emptyDay, isoDate, mondayOf, normalizeWeekData, startOfWeekFor } from '../utils/dateUtils';
import type { DayData, WeekData, WeekStartDay } from '../types';

/**
 * Week persistence: the loaded week, load/save against Firestore + localStorage,
 * the save-status toast, and the "flush before leaving" guards.
 * Extracted from App.tsx (step 5 of the decomposition).
 *
 * Saving model (unchanged):
 * - localStorage is written immediately on every edit (zero data loss).
 * - Firestore is debounced 3s while typing; Enter/tag changes/actions pass
 *   `immediate = true` and skip the wait.
 * - A pending debounced save is flushed on tab hide / page unload and before
 *   navigating to another week.
 */
export function useWeekPersistence(lang: 'ar' | 'en') {
  const [weekData, setWeekData] = useState<WeekData>(() => {
    const initialDay = (localStorage.getItem('weekStartDay') as WeekStartDay) || 'saturday';
    const ws = startOfWeekFor(new Date(), initialDay);
    const days: Record<string, DayData> = {};
    for (let i = 0; i < 7; i++) {
      days[isoDate(addDays(ws, i))] = emptyDay();
    }
    return { days };
  });

  const [saveStatus, setSaveStatus] = useState<string>('');
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);

  // Debounced save refs (3s after typing stops, instant on Enter/Tag/Action/Page-Close)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<{ updated: WeekData; ws: Date; user: User | null } | null>(null);

  // Load Week Data from Firestore or LocalStorage (with fallback for legacy weeks)
  const loadWeekData = useCallback(async (ws: Date, user: User | null) => {
    const monKey = isoDate(mondayOf(ws));
    const wsKey = isoDate(ws);
    const localKey = `time_log_week_${user ? user.uid : 'guest'}_${monKey}`;

    if (db && user) {
      try {
        // 1. First try the standard user-scoped path
        let docRef = doc(db, 'artifacts', 'time-log-app', 'users', user.uid, 'weeks', monKey);
        let snap = await getDoc(docRef);

        // 2. If not found and wsKey is different (e.g. Saturday start), also check wsKey
        if (!snap.exists() && wsKey !== monKey) {
          docRef = doc(db, 'artifacts', 'time-log-app', 'users', user.uid, 'weeks', wsKey);
          snap = await getDoc(docRef);
        }

        // 3. Fallback: Check legacy root collection /weeks and auto-migrate to user-scoped path
        if (!snap.exists()) {
          const oldDocRef = doc(db, 'weeks', monKey);
          const oldSnap = await getDoc(oldDocRef);
          if (oldSnap.exists()) {
            snap = oldSnap;
            const oldData = oldSnap.data();
            if (oldData && oldData.json) {
              setDoc(doc(db, 'artifacts', 'time-log-app', 'users', user.uid, 'weeks', monKey), {
                json: oldData.json,
                updatedAt: new Date().toISOString()
              }, { merge: true });
            }
          }
        }

        // Never overwrite active user typing that occurred while Firestore fetch was in flight
        if (pendingSaveRef.current) {
          setIsDataLoaded(true);
          return;
        }

        if (snap.exists()) {
          const data = snap.data();
          if (data && data.json) {
            const parsed = JSON.parse(data.json);
            const normalized = normalizeWeekData(parsed, ws);
            setWeekData(normalized);
            localStorage.setItem(localKey, JSON.stringify(normalized));
            setIsDataLoaded(true);
            return;
          }
        }
      } catch (err) {
        console.warn('Firestore week fetch error, falling back to local storage:', err);
      }
    }

    if (pendingSaveRef.current) {
      setIsDataLoaded(true);
      return;
    }

    // Check local storage cache
    const cached = localStorage.getItem(localKey) || localStorage.getItem(`time_log_week_${user ? user.uid : 'guest'}_${wsKey}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const normalized = normalizeWeekData(parsed, ws);
        setWeekData(normalized);
        setIsDataLoaded(true);
        return;
      } catch { }
    }

    // Default empty week with normalized structures
    const empty = normalizeWeekData({}, ws);
    setWeekData(empty);
    setIsDataLoaded(true);
  }, []);

  const flushSaveToCloud = useCallback(
    async (updated: WeekData, ws: Date, user: User | null, showToast = true) => {
      if (showToast) setSaveStatus(STRINGS[lang].saving);
      const monKey = isoDate(mondayOf(ws));
      const localKey = `time_log_week_${user ? user.uid : 'guest'}_${monKey}`;
      const jsonStr = JSON.stringify(updated);
      localStorage.setItem(localKey, jsonStr);

      if (db && user) {
        try {
          const docRef = doc(db, 'artifacts', 'time-log-app', 'users', user.uid, 'weeks', monKey);
          await setDoc(docRef, { json: jsonStr, updatedAt: new Date().toISOString() });
        } catch (err) {
          console.warn('Failed to sync week to Firestore:', err);
        }
      }

      if (showToast) {
        setSaveStatus(STRINGS[lang].saved);
        setTimeout(() => setSaveStatus(''), 2000);
      }
    },
    [lang]
  );

  // Save Week Data (3-second debounce for typing, immediate for Enter/Tag/Checkboxes)
  const saveWeekData = useCallback(
    (updated: WeekData, ws: Date, user: User | null, immediate = false) => {
      // Always persist to localStorage immediately on every change for zero data loss
      const monKey = isoDate(mondayOf(ws));
      const localKey = `time_log_week_${user ? user.uid : 'guest'}_${monKey}`;
      localStorage.setItem(localKey, JSON.stringify(updated));

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      if (immediate) {
        pendingSaveRef.current = null;
        flushSaveToCloud(updated, ws, user, true);
      } else {
        pendingSaveRef.current = { updated, ws, user };
        saveTimeoutRef.current = setTimeout(() => {
          pendingSaveRef.current = null;
          saveTimeoutRef.current = null;
          flushSaveToCloud(updated, ws, user, true);
        }, 3000);
      }
    },
    [flushSaveToCloud]
  );

  const flushPendingSaveNow = useCallback(
    (showToast = false) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      if (pendingSaveRef.current) {
        const { updated, ws, user } = pendingSaveRef.current;
        pendingSaveRef.current = null;
        flushSaveToCloud(updated, ws, user, showToast);
      }
    },
    [flushSaveToCloud]
  );

  // Silent instant flush on page unload or tab hide if typing debounce is still pending
  useEffect(() => {
    const flushOnLeave = () => flushPendingSaveNow(false);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingSaveNow(false);
      }
    };

    window.addEventListener('beforeunload', flushOnLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', flushOnLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flushPendingSaveNow]);

  return {
    weekData,
    setWeekData,
    saveStatus,
    setSaveStatus,
    isDataLoaded,
    setIsDataLoaded,
    loadWeekData,
    saveWeekData,
    flushPendingSaveNow
  };
}
