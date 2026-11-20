import { useCallback, useState } from 'react';
import type { User } from 'firebase/auth';
import { db, doc, setDoc } from '../services/firebase';
import { DEFAULT_TAG_TARGETS } from '../constants/config';
import type { AgeDisplayOpt, SleepSettings, TagTargets, ThemeMode, WeekStartDay } from '../types';

interface UsePreferencesOptions {
  currentUser: User | null;
  /** Live sleep window (owned by useSleepWindow) — stored with the preferences. */
  sleepSettings: SleepSettings;
  /** Live theme mode (owned by useTheme) — stored with the preferences. */
  themeMode: ThemeMode;
  /** Closes the Todo drawer when the inbox is hidden from the planning suite. */
  closeTodoDrawer: () => void;
}

/**
 * User preferences: every visibility / planning / calendar / age toggle plus the
 * single `syncPreferences` writer (localStorage + Firestore) and the planning
 * suite coordinator.
 * Extracted from App.tsx (step 6 — the last step of the decomposition).
 */
export function usePreferences({
  currentUser,
  sleepSettings,
  themeMode,
  closeTodoDrawer
}: UsePreferencesOptions) {
  // Week starts on Saturday by default (saturday / sunday / monday)
  const [weekStartDay, setWeekStartDay] = useState<WeekStartDay>(() => {
    return (localStorage.getItem('weekStartDay') as WeekStartDay) || 'saturday';
  });

  // Default is Compact View (false/مدمج), unless user explicitly saved 'true'
  const [isDetailedView, setIsDetailedView] = useState<boolean>(() => {
    return localStorage.getItem('isDetailedView') === 'true';
  });

  const handleToggleDetailedView = useCallback((explicitValue?: unknown) => {
    setIsDetailedView((prev) => {
      const next = typeof explicitValue === 'boolean' ? explicitValue : !prev;
      localStorage.setItem('isDetailedView', String(next));
      if (db && currentUser) {
        const docRef = doc(db, 'users', currentUser.uid, 'settings', 'preferences');
        setDoc(docRef, { isDetailedView: next, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => { });
      }
      return next;
    });
  }, [currentUser]);

  const [devToolsEnabled, setDevToolsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('devToolsEnabled') !== 'false';
  });
  const [showAgeBadge, setShowAgeBadge] = useState<boolean>(() => {
    return localStorage.getItem('showAgeBadge') === 'true';
  });
  const [showStreakBadge, setShowStreakBadge] = useState<boolean>(() => {
    return localStorage.getItem('showStreakBadge') !== 'false';
  });
  const [showFocusModeButton, setShowFocusModeButton] = useState<boolean>(() => {
    return localStorage.getItem('showFocusModeButton') === 'true';
  });
  const [showGoldenGoal, setShowGoldenGoal] = useState<boolean>(() => {
    const saved = localStorage.getItem('showGoldenGoal');
    return saved !== null ? saved === 'true' : localStorage.getItem('showPrioritiesSection') === 'true';
  });
  const [showPriorityMatrix, setShowPriorityMatrix] = useState<boolean>(() => {
    const saved = localStorage.getItem('showPriorityMatrix');
    return saved !== null ? saved === 'true' : localStorage.getItem('showPrioritiesSection') === 'true';
  });
  const [showTodoInbox, setShowTodoInbox] = useState<boolean>(() => {
    return localStorage.getItem('showTodoInbox') !== 'false';
  });
  const showPrioritiesSection = showGoldenGoal || showPriorityMatrix;
  const [morningNudgeEnabled, setMorningNudgeEnabled] = useState<boolean>(() => {
    return localStorage.getItem('morningNudgeEnabled') === 'true';
  });
  const [tagTargets, setTagTargets] = useState<TagTargets>(() => {
    try {
      const saved = localStorage.getItem('tagTargets');
      return saved ? { ...DEFAULT_TAG_TARGETS, ...JSON.parse(saved) } : DEFAULT_TAG_TARGETS;
    } catch {
      return DEFAULT_TAG_TARGETS;
    }
  });
  const [focusModeActive, setFocusModeActive] = useState<boolean>(false);
  const [calSyncEnabled, setCalSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('calSyncEnabled') !== 'false';
  });

  // Auto Cloud Sync — syncs all local weeks to Firestore on login when enabled
  const [autoCloudSync, setAutoCloudSync] = useState<boolean>(() => {
    return localStorage.getItem('autoCloudSync') === 'true';
  });

  const [userBirthDate, setUserBirthDate] = useState<string>(() => {
    return localStorage.getItem('userBirthDate') || '';
  });
  const [ageDisplayOpt, setAgeDisplayOpt] = useState<AgeDisplayOpt>(() => {
    const saved = localStorage.getItem('ageDisplayOpt');
    if (saved === 'days' || saved === 'years') return saved;
    return 'none';
  });

  // Sync Preferences to Firestore & Local
  const syncPreferences = useCallback(
    async (
      user: User | null,
      customWeekStartDay?: WeekStartDay,
      prefOverrides?: { showGoldenGoal?: boolean; showPriorityMatrix?: boolean; showTodoInbox?: boolean }
    ) => {
      const activeWeekStartDay = customWeekStartDay || weekStartDay;
      const nextGolden = prefOverrides?.showGoldenGoal ?? showGoldenGoal;
      const nextMatrix = prefOverrides?.showPriorityMatrix ?? showPriorityMatrix;
      const nextTodo = prefOverrides?.showTodoInbox ?? showTodoInbox;
      const nextPrioritiesSection = nextGolden || nextMatrix;

      localStorage.setItem('sleepSettings', JSON.stringify(sleepSettings));
      localStorage.setItem('userBirthDate', userBirthDate);
      localStorage.setItem('ageDisplayOpt', ageDisplayOpt);
      localStorage.setItem('weekStartDay', activeWeekStartDay);
      localStorage.setItem('devToolsEnabled', String(devToolsEnabled));
      localStorage.setItem('showAgeBadge', String(showAgeBadge));
      localStorage.setItem('showStreakBadge', String(showStreakBadge));
      localStorage.setItem('showFocusModeButton', String(showFocusModeButton));
      localStorage.setItem('showGoldenGoal', String(nextGolden));
      localStorage.setItem('showPriorityMatrix', String(nextMatrix));
      localStorage.setItem('showTodoInbox', String(nextTodo));
      localStorage.setItem('showPrioritiesSection', String(nextPrioritiesSection));
      localStorage.setItem('morningNudgeEnabled', String(morningNudgeEnabled));
      localStorage.setItem('tagTargets', JSON.stringify(tagTargets));
      localStorage.setItem('calSyncEnabled', String(calSyncEnabled));
      localStorage.setItem('themeMode', themeMode);
      localStorage.setItem('isDetailedView', String(isDetailedView));
      localStorage.setItem('autoCloudSync', String(autoCloudSync));

      if (db && user) {
        try {
          const docRef = doc(db, 'users', user.uid, 'settings', 'preferences');
          await setDoc(
            docRef,
            {
              sleepWindow: sleepSettings,
              birthDate: userBirthDate,
              ageDisplayOpt,
              weekStartDay: activeWeekStartDay,
              devToolsEnabled,
              showAgeBadge,
              showStreakBadge,
              showFocusModeButton,
              showGoldenGoal: nextGolden,
              showPriorityMatrix: nextMatrix,
              showTodoInbox: nextTodo,
              showPrioritiesSection: nextPrioritiesSection,
              morningNudgeEnabled,
              tagTargets,
              calSyncEnabled,
              themeMode,
              isDetailedView,
              autoCloudSync,
              updatedAt: new Date().toISOString()
            },
            { merge: true }
          );
        } catch (err) {
          console.warn('Failed to sync preferences to Firestore:', err);
        }
      }
    },
    [sleepSettings, userBirthDate, ageDisplayOpt, showAgeBadge, weekStartDay, devToolsEnabled, showStreakBadge, showFocusModeButton, showGoldenGoal, showPriorityMatrix, showTodoInbox, morningNudgeEnabled, tagTargets, calSyncEnabled, themeMode, isDetailedView, autoCloudSync]
  );

  const updatePlanningVisibility = useCallback(
    (updates: { showGoldenGoal?: boolean; showPriorityMatrix?: boolean; showTodoInbox?: boolean }) => {
      const nextGolden = updates.showGoldenGoal ?? showGoldenGoal;
      const nextMatrix = updates.showPriorityMatrix ?? showPriorityMatrix;
      const nextTodo = updates.showTodoInbox ?? showTodoInbox;
      setShowGoldenGoal(nextGolden);
      setShowPriorityMatrix(nextMatrix);
      setShowTodoInbox(nextTodo);
      if (!nextTodo) closeTodoDrawer();
      syncPreferences(currentUser, undefined, {
        showGoldenGoal: nextGolden,
        showPriorityMatrix: nextMatrix,
        showTodoInbox: nextTodo
      });
    },
    [showGoldenGoal, showPriorityMatrix, showTodoInbox, currentUser, syncPreferences, closeTodoDrawer]
  );

  return {
    weekStartDay,
    setWeekStartDay,
    isDetailedView,
    setIsDetailedView,
    handleToggleDetailedView,
    devToolsEnabled,
    setDevToolsEnabled,
    showAgeBadge,
    setShowAgeBadge,
    showStreakBadge,
    setShowStreakBadge,
    showFocusModeButton,
    setShowFocusModeButton,
    showGoldenGoal,
    setShowGoldenGoal,
    showPriorityMatrix,
    setShowPriorityMatrix,
    showTodoInbox,
    setShowTodoInbox,
    showPrioritiesSection,
    morningNudgeEnabled,
    setMorningNudgeEnabled,
    tagTargets,
    setTagTargets,
    focusModeActive,
    setFocusModeActive,
    calSyncEnabled,
    setCalSyncEnabled,
    autoCloudSync,
    setAutoCloudSync,
    userBirthDate,
    setUserBirthDate,
    ageDisplayOpt,
    setAgeDisplayOpt,
    syncPreferences,
    updatePlanningVisibility
  };
}
