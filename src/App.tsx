import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { User } from 'firebase/auth';
import { auth, db, doc, setDoc, getDoc, signOut, signInWithPopup, googleProvider, GoogleAuthProvider, onAuthStateChanged, loadFirebase } from './services/firebase';
import {
  TagCode,
  GoalItem,
  TodoItem,
  DayData,
  WeekData,
  WeekStartDay
} from './types';
import {
  STRINGS
} from './constants/config';
import {
  startOfWeekFor,
  mondayOf,
  isoDate,
  addDays,
  emptyDay,
  focusCurrentHourInput
} from './utils/dateUtils';
import { calculateDailyStreak } from './utils/streakUtils';
import { findDayDataAcrossWeeks, hasLoggedHours } from './utils/dayLookup';
import {
  buildWrapUpSummary,
  getWrapUpDayKey,
  getWrapUpSeenKey,
  shouldOfferEveningWrapUp
} from './utils/eveningWrapUp';
import { soundManager } from './utils/soundEffects';
import { restoreFullBackup, syncAllWeeksToCloud, type FullBackup } from './utils/backupUtils';
import confetti from 'canvas-confetti';
import { clearAllCachedCalendarEvents } from './services/calendarService';

// Components
import { Header } from './components/Header';
import { WeekNavigator } from './components/WeekNavigator';
import { TagRingsOverview } from './components/TagRingsOverview';
import { HoursList } from './components/HoursList';
import { PrioritiesSection } from './components/PrioritiesSection';
import { TagLegend } from './components/TagLegend';
import { SaveToast } from './components/SaveToast';
import { UpdateToast } from './components/UpdateToast';
import { useModalState } from './hooks/useModalState';
import { useSleepWindow } from './hooks/useSleepWindow';
import { useCalendar } from './hooks/useCalendar';
import { useTheme } from './hooks/useTheme';
import { useWeekPersistence } from './hooks/useWeekPersistence';
import { usePreferences } from './hooks/usePreferences';

// FocusPomodoroView stays eagerly imported because it must remain mounted so the
// background timer keeps running even while its window is minimized.
import { FocusPomodoroView } from './components/FocusPomodoroView';
import {
  AuthModal,
  DayDistModal,
  ChartsModal,
  AiSummaryModal,
  ExportModal,
  SleepOnboardModal,
  AgeSettingsModal,
  PwaModal,
  SettingsModal,
  GuideModal,
  TodoInboxDrawer,
  MorningNudgeModal,
  EveningWrapUpModal,
  GlobalSearchModal
} from './components/lazyModals';
import { computeDayStats, collectAllDays } from './utils/dayStats';
import { getBirthdayInfo, isBirthdayToday } from './utils/birthday';
import { rolloverIncomplete } from './utils/dayEdits';
import { usePomodoroLogging } from './hooks/usePomodoroLogging';
import { useTodoInbox } from './hooks/useTodoInbox';
import { applyCloudPreferences } from './utils/cloudPreferences';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { HoursSectionHeader } from './components/HoursSectionHeader';
import { ToolsBar } from './components/ToolsBar';
import { AppFooter } from './components/AppFooter';


export default function App() {
  // 0. Brain Dump drawer (the inbox itself lives in useTodoInbox)
  const [todoDrawerOpen, setTodoDrawerOpen] = useState(false);
  // Stable callback so usePreferences can close the drawer without re-subscribing
  const closeTodoDrawer = useCallback(() => setTodoDrawerOpen(false), []);

  // 1. Core Date & Data State
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const initialDay = (localStorage.getItem('weekStartDay') as WeekStartDay) || 'saturday';
    return startOfWeekFor(new Date(), initialDay);
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // 2. Preferences State
  const [lang, setLang] = useState<'ar' | 'en'>(() => {
    return (localStorage.getItem('lang') as 'ar' | 'en') || 'ar';
  });

  // 3. Week Data (load / save / debounce) — extracted to useWeekPersistence.
  // Must stay after `lang` (used for the save-status strings) and before the
  // streak calculation below, which reads `weekData.days`.
  const {
    weekData,
    setWeekData,
    saveStatus,
    setSaveStatus,
    isDataLoaded,
    loadWeekData,
    saveWeekData,
    flushPendingSaveNow,
    discardPendingSave
  } = useWeekPersistence(lang);

  // 3-State Theme Mode (extracted to useTheme)
  const {
    themeMode,
    setThemeMode,
    isDarkEffective,
    handleCycleThemeMode,
    handleChangeThemeMode,
    themePalette,
    setThemePalette,
    handleChangeThemePalette
  } = useTheme(currentUser);

  // 4. Sleep Window State (extracted to useSleepWindow).
  // Declared before usePreferences because the sleep window is stored with the
  // other preferences in Firestore.
  const {
    sleepSettings,
    setSleepSettings,
    sleepExceptionDays,
    setSleepExceptionDays,
    sleepHourKeys,
    activeHoursKeys
  } = useSleepWindow();

  // 5. Preferences State (extracted to usePreferences)
  const {
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
    eveningWrapUpEnabled,
    setEveningWrapUpEnabled,
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
  } = usePreferences({ currentUser, sleepSettings, themeMode, closeTodoDrawer });

  // Ephemeral UI state (not a stored preference)
  const [morningNudgeOpen, setMorningNudgeOpen] = useState<boolean>(false);
  // Evening Wrap-up (#09): the reviewed day is captured when the prompt opens
  const [eveningWrapUpOpen, setEveningWrapUpOpen] = useState<boolean>(false);
  const [wrapUpDay, setWrapUpDay] = useState<DayData | null>(null);
  const [wrapUpDayKey, setWrapUpDayKey] = useState<string>('');

  // 6. Google Calendar & Suggestions (extracted to useCalendar)
  const {
    gcalAccessToken,
    setGcalAccessToken,
    googleCalendarEvents,
    dismissedSuggestions,
    setDismissedSuggestions
  } = useCalendar(calSyncEnabled, currentDate);

  // Manual "sync all local weeks to the cloud" action (not a preference)
  const [isSyncingAllWeeks, setIsSyncingAllWeeks] = useState(false);
  const handleSyncAllWeeksNow = useCallback(async () => {
    if (!currentUser || !db) return;
    setIsSyncingAllWeeks(true);
    try {
      return await syncAllWeeksToCloud(currentUser.uid, db, doc, setDoc);
    } finally {
      setIsSyncingAllWeeks(false);
    }
  }, [currentUser]);

  // 7. Modals State (extracted to useModalState to keep App.tsx smaller)
  const {
    authModalOpen,
    setAuthModalOpen,
    settingsModalOpen,
    setSettingsModalOpen,
    dayDistModalOpen,
    setDayDistModalOpen,
    chartsModalOpen,
    setChartsModalOpen,
    aiSummaryModalOpen,
    setAiSummaryModalOpen,
    exportModalOpen,
    setExportModalOpen,
    sleepOnboardModalOpen,
    setSleepOnboardModalOpen,
    ageModalOpen,
    setAgeModalOpen,
    pwaModalOpen,
    setPwaModalOpen,
    guideModalOpen,
    setGuideModalOpen,
    globalSearchOpen,
    setGlobalSearchOpen,
    pomoBgState,
    setPomoBgState
  } = useModalState();

  // Set HTML dir & lang
  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  }, [lang]);

  // Dark-mode class effect now lives inside useTheme.

  // Sleep hour keys are derived inside useSleepWindow (sleepHourKeys / activeHoursKeys).

  // Current selected day data
  const dateStr = isoDate(currentDate);
  const currentDayData = weekData.days[dateStr] || emptyDay();
  const isSleepExceptionToday = !!sleepExceptionDays[dateStr];
  const isToday = dateStr === isoDate(new Date());

  // Tag counts & logged/empty totals for the selected day's active hours
  const { tagCounts, activeLoggedCount, unassignedCount, emptyHoursCount } = computeDayStats(
    currentDayData,
    activeHoursKeys
  );

  // Daily streak across the loaded week and every cached local week
  const { allDaysHours, allDaysGolden } = collectAllDays(weekData);
  const { streak: dailyStreak, hasToday: streakHasToday } = calculateDailyStreak(allDaysHours, allDaysGolden);

  // Auth State Listener (runs once on mount; uses refs for active date/weekStart to avoid infinite re-subscribe loop)
  const currentDateRef = useRef<Date>(currentDate);
  currentDateRef.current = currentDate;
  const weekStartRef = useRef<Date>(weekStart);
  weekStartRef.current = weekStart;

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let cancelled = false;

    // Fast path: load the last known user's local data immediately, so the calendar
    // is never empty while the lazy Firebase SDK downloads.
    const lastUid = localStorage.getItem('timelog_last_uid');
    loadWeekData(weekStartRef.current, lastUid ? ({ uid: lastUid } as unknown as User) : null);

    loadFirebase().then(() => {
      if (cancelled || !onAuthStateChanged) return;
      unsub = onAuthStateChanged(auth, async (authUser) => {
      // An email/password account only counts as signed in once its email is
      // activated. The sign-up flow signs it straight out again; until then the
      // app must not load or sync anything for it.
      const u =
        authUser && !authUser.emailVerified && authUser.providerData.every((p) => p.providerId === 'password')
          ? null
          : authUser;
      setCurrentUser(u);
      if (u) localStorage.setItem('timelog_last_uid', u.uid);
      let targetWs = weekStartRef.current;

      if (u) {
        // Load user preferences from Firestore if available
        try {
          const docRef = doc(db!, 'users', u.uid, 'settings', 'preferences');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const storedWeekStartDay = applyCloudPreferences(snap.data(), {
              setSleepSettings,
              setUserBirthDate,
              setAgeDisplayOpt,
              setThemeMode,
              setThemePalette,
              setIsDetailedView,
              setDevToolsEnabled,
              setShowAgeBadge,
              setShowStreakBadge,
              setShowFocusModeButton,
              setShowGoldenGoal,
              setShowPriorityMatrix,
              setShowTodoInbox,
              setMorningNudgeEnabled,
              setEveningWrapUpEnabled,
              setTagTargets,
              setCalSyncEnabled,
              setAutoCloudSync,
              setWeekStartDay
            });
            if (storedWeekStartDay) {
              const computedWs = startOfWeekFor(currentDateRef.current, storedWeekStartDay);
              targetWs = computedWs;
              if (isoDate(computedWs) !== isoDate(weekStartRef.current)) {
                setWeekStart(computedWs);
              }
            }
          }
        } catch { }
      } else {
        setCurrentUser(null);
      }
      loadWeekData(targetWs, u);

      // Auto Cloud Sync: push all local weeks to Firestore once per session on login
      if (u && db && autoCloudSync) {
        syncAllWeeksToCloud(u.uid, db, doc, setDoc).catch((err) => {
          console.warn('Auto cloud sync error:', err);
        });
      }
      });
    }).catch(() => {});

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [loadWeekData]); // eslint-disable-line react-hooks/exhaustive-deps -- one-shot mount effect: refs hold live values, every setter is a stable dispatcher

  // Sleep onboarding effect now lives inside useSleepWindow.

  // Handlers for Focus Delegation
  const delegateStartupFocus = useCallback(() => {
    const todayStr = isoDate(new Date());
    const day = weekData.days[todayStr];
    const hasGolden = !!(day && day.goldenGoal && day.goldenGoal.text && day.goldenGoal.text.trim() !== '');

    setTimeout(() => {
      if (showGoldenGoal && !hasGolden) {
        const el = document.getElementById('golden-goal-input');
        if (el) {
          el.focus();
          return;
        }
      }
      focusCurrentHourInput();
    }, 150);
  }, [weekData.days, showGoldenGoal]);

  // Startup prompts: the Evening Wrap-up (05:00+, reviews yesterday) takes
  // precedence over the Morning Nudge (08:00–14:00), which is offered once the
  // wrap-up is dismissed.
  const isMorningNudgeDue = useCallback(() => {
    const now = new Date();
    const hour = now.getHours();
    const seen = localStorage.getItem(`morning_nudge_seen_${isoDate(now)}`) === 'true';
    return morningNudgeEnabled && hour >= 8 && hour < 14 && !seen;
  }, [morningNudgeEnabled]);

  const initialStartupFocusDoneRef = useRef(false);
  useEffect(() => {
    if (!isDataLoaded || initialStartupFocusDoneRef.current) return;
    initialStartupFocusDoneRef.current = true;

    const now = new Date();
    const reviewedKey = getWrapUpDayKey(now);
    const reviewedDay = findDayDataAcrossWeeks(reviewedKey, currentUser?.uid ?? null, weekData);
    const alreadySeen = localStorage.getItem(getWrapUpSeenKey(reviewedKey)) === 'true';

    if (
      shouldOfferEveningWrapUp({
        enabled: eveningWrapUpEnabled,
        now,
        hasData: hasLoggedHours(reviewedDay),
        alreadySeen
      })
    ) {
      setWrapUpDayKey(reviewedKey);
      setWrapUpDay(reviewedDay);
      setEveningWrapUpOpen(true);
      return;
    }

    if (isMorningNudgeDue()) {
      setMorningNudgeOpen(true);
    } else {
      delegateStartupFocus();
    }
  }, [isDataLoaded, eveningWrapUpEnabled, isMorningNudgeDue, currentUser, weekData, delegateStartupFocus]);

  const handleCloseEveningWrapUp = useCallback(() => {
    setEveningWrapUpOpen(false);
    if (wrapUpDayKey) {
      localStorage.setItem(getWrapUpSeenKey(wrapUpDayKey), 'true');
    }
    if (isMorningNudgeDue()) {
      setMorningNudgeOpen(true);
    } else {
      delegateStartupFocus();
    }
  }, [wrapUpDayKey, isMorningNudgeDue, delegateStartupFocus]);

  // Yesterday (for the Morning Nudge) and the wrap-up summary, derived once per data change.
  const yesterdayNudgeData = useMemo(
    () => findDayDataAcrossWeeks(isoDate(addDays(new Date(), -1)), currentUser?.uid ?? null, weekData),
    [weekData, currentUser]
  );

  const wrapUpSummary = useMemo(
    () => (wrapUpDay ? buildWrapUpSummary(wrapUpDay, tagTargets, activeHoursKeys.length) : null),
    [wrapUpDay, tagTargets, activeHoursKeys.length]
  );

  const wrapUpDayLabel = wrapUpDayKey
    ? new Date(`${wrapUpDayKey}T00:00:00`).toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })
    : '';

  // Handlers for Hours List
  const handleChangeHour = (key: string, text: string, tag: TagCode, immediate = false) => {
    setWeekData((prevWeek) => {
      const prevDay = prevWeek.days[dateStr] || emptyDay();
      const updatedDay: DayData = {
        ...prevDay,
        hours: {
          ...prevDay.hours,
          [key]: { text, tag }
        }
      };
      const newWeek: WeekData = {
        ...prevWeek,
        days: {
          ...prevWeek.days,
          [dateStr]: updatedDay
        }
      };
      saveWeekData(newWeek, weekStart, currentUser, immediate);
      return newWeek;
    });
  };

  const handleCopyDown = (sourceKey: string, targetKey: string) => {
    const sourceEntry = currentDayData.hours[sourceKey] || { text: '', tag: '' };
    if (!sourceEntry.text.trim() && !sourceEntry.tag) return;
    handleChangeHour(targetKey, sourceEntry.text, sourceEntry.tag, true);
  };

  const handleToggleSleepException = () => {
    const updated = {
      ...sleepExceptionDays,
      [dateStr]: !sleepExceptionDays[dateStr]
    };
    setSleepExceptionDays(updated);
    localStorage.setItem('sleepExceptionDays', JSON.stringify(updated));
  };

  // Batch Apply All Available Google Calendar Events to Empty Hours Today
  const handleBatchApplyCalendarEvents = () => {
    const unapplied = Object.entries(googleCalendarEvents).filter(
      ([key]) => !currentDayData.hours[key]?.text?.trim()
    );
    if (unapplied.length === 0) return;

    soundManager.playSuccess();
    setWeekData((prevWeek) => {
      const todayDay = prevWeek.days[dateStr] || emptyDay();
      const newHours = { ...todayDay.hours };
      unapplied.forEach(([key, ev]) => {
        newHours[key] = {
          text: ev.text,
          tag: ev.tag || 'E'
        };
      });
      const updatedWeek: WeekData = {
        ...prevWeek,
        days: {
          ...prevWeek.days,
          [dateStr]: {
            ...todayDay,
            hours: newHours
          }
        }
      };
      saveWeekData(updatedWeek, weekStart, currentUser, true);
      return updatedWeek;
    });

    setSaveStatus(
      lang === 'ar'
        ? `✅ تم استيراد ${unapplied.length} مواعيد من تقويم جوجل بنجاح!`
        : `✅ Imported ${unapplied.length} Google Calendar events successfully!`
    );
    setTimeout(() => setSaveStatus(''), 3500);
  };

  // Brain Dump & Todo Inbox (useTodoInbox)
  const { todoInbox, saveTodoInbox, handleAddTodo, handleToggleTodo, handleDeleteTodo, markTodoPromoted } =
    useTodoInbox({ currentUser, lang, setSaveStatus });

  const handlePromoteTodoToGolden = (todo: TodoItem) => {
    handleChangeGoldenGoal({ text: todo.text, done: false, tag: (todo.tag || '') as TagCode }, true);
    markTodoPromoted(todo.id, 'golden');
    setSaveStatus(lang === 'ar' ? '⭐ تم التعيين كهدف ذهبي لليوم!' : '⭐ Promoted to Golden Goal for today!');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const handlePromoteTodoToQuad = (todo: TodoItem, quadKey: 'q1' | 'q2' | 'q3' | 'q4') => {
    const existingList = currentDayData.priorities[quadKey] || [];
    const cleanList = existingList.filter((item) => item.text.trim() !== '');

    // Prevent duplicate: check if task text is already present in this quad
    const isAlreadyInQuad = cleanList.some(
      (item) => item.text.trim().toLowerCase() === todo.text.trim().toLowerCase()
    );
    if (isAlreadyInQuad) {
      // Mark as promoted in inbox if not marked yet
      markTodoPromoted(todo.id, 'quad', quadKey);
      setSaveStatus(
        lang === 'ar'
          ? `⚠️ المهمة موجودة بالفعل في مربع (${quadKey.toUpperCase()})`
          : `⚠️ Task is already in (${quadKey.toUpperCase()})`
      );
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    const updatedList = [...cleanList, { text: todo.text, done: false, tag: (todo.tag || '') as TagCode }];
    handleChangePriorities(quadKey, updatedList, true);
    markTodoPromoted(todo.id, 'quad', quadKey);
    setSaveStatus(
      lang === 'ar'
        ? `🎯 تم النقل إلى مصفوفة الأولويات (${quadKey.toUpperCase()}) بنجاح!`
        : `🎯 Sent to Priority Quadrant (${quadKey.toUpperCase()}) successfully!`
    );
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Handlers for Priorities
  const handleChangeGoldenGoal = (item: GoalItem, immediate = false) => {
    setWeekData((prevWeek) => {
      const prevDay = prevWeek.days[dateStr] || emptyDay();
      const wasDone = prevDay.goldenGoal.done;
      const updatedDay: DayData = {
        ...prevDay,
        goldenGoal: item
      };
      const newWeek: WeekData = {
        ...prevWeek,
        days: {
          ...prevWeek.days,
          [dateStr]: updatedDay
        }
      };
      saveWeekData(newWeek, weekStart, currentUser, immediate);

      // Confetti celebration on completion!
      if (!wasDone && item.done && item.text.trim() !== '') {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
      }
      return newWeek;
    });
  };

  const handleChangePriorities = (quadKey: 'q1' | 'q2' | 'q3' | 'q4', items: GoalItem[], immediate = false) => {
    setWeekData((prevWeek) => {
      const prevDay = prevWeek.days[dateStr] || emptyDay();
      const updatedDay: DayData = {
        ...prevDay,
        priorities: {
          ...prevDay.priorities,
          [quadKey]: items
        }
      };
      const newWeek: WeekData = {
        ...prevWeek,
        days: {
          ...prevWeek.days,
          [dateStr]: updatedDay
        }
      };
      saveWeekData(newWeek, weekStart, currentUser, immediate);
      return newWeek;
    });
  };

  const handlePromoteToGolden = (item: GoalItem, quadKey: 'q1' | 'q2' | 'q3' | 'q4', itemIdx: number) => {
    if (currentDayData.goldenGoal.text && currentDayData.goldenGoal.text.trim() !== '') {
      setSaveStatus(STRINGS[lang].goldenNotEmpty);
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }
    setWeekData((prevWeek) => {
      const prevDay = prevWeek.days[dateStr] || emptyDay();
      const currentQuadList = prevDay.priorities[quadKey] || [];
      const filtered = currentQuadList.filter((_, idx) => idx !== itemIdx);
      const updatedDay: DayData = {
        ...prevDay,
        goldenGoal: { text: item.text, done: item.done || false, tag: item.tag || '' },
        priorities: {
          ...prevDay.priorities,
          [quadKey]: filtered.length === 0 ? [{ text: '', done: false, tag: '' }] : filtered
        }
      };
      const newWeek: WeekData = {
        ...prevWeek,
        days: {
          ...prevWeek.days,
          [dateStr]: updatedDay
        }
      };
      saveWeekData(newWeek, weekStart, currentUser, true);
      return newWeek;
    });
    setSaveStatus(lang === 'ar' ? '✨ تم نقل الهدف إلى الهدف الذهبي بنجاح' : '✨ Moved to Golden Goal successfully');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleRollover = async () => {
    const tomorrowDate = addDays(currentDate, 1);
    const tomorrowStr = isoDate(tomorrowDate);
    const { tomorrow: tomorrowDay, movedCount } = rolloverIncomplete(
      currentDayData,
      weekData.days[tomorrowStr] || emptyDay()
    );
    const newWeek = { ...weekData, days: { ...weekData.days, [tomorrowStr]: tomorrowDay } };
    setWeekData(newWeek);
    saveWeekData(newWeek, weekStart, currentUser, true);

    // If tomorrow falls in the next week, also sync to the next week's storage document
    const currentMonKey = isoDate(mondayOf(currentDate));
    const tomorrowMonKey = isoDate(mondayOf(tomorrowDate));
    if (tomorrowMonKey !== currentMonKey) {
      const localKeyNext = `time_log_week_${currentUser ? currentUser.uid : 'guest'}_${tomorrowMonKey}`;
      let nextWeekObj: WeekData = { days: {} };
      const rawNext = localStorage.getItem(localKeyNext);
      if (rawNext) {
        try {
          nextWeekObj = JSON.parse(rawNext);
        } catch { }
      }
      nextWeekObj.days = nextWeekObj.days || {};
      nextWeekObj.days[tomorrowStr] = tomorrowDay;
      localStorage.setItem(localKeyNext, JSON.stringify(nextWeekObj));

      if (db && currentUser) {
        try {
          const nextDocRef = doc(db, 'artifacts', 'time-log-app', 'users', currentUser.uid, 'weeks', tomorrowMonKey);
          setDoc(nextDocRef, { json: JSON.stringify(nextWeekObj), updatedAt: new Date().toISOString() }, { merge: true });
        } catch (err) {
          console.warn('Firestore next week sync error on rollover:', err);
        }
      }
    }

    if (movedCount > 0) {
      try {
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.85 },
          disableForReducedMotion: true
        });
      } catch { }
      setSaveStatus(STRINGS[lang].rolloverSuccess(movedCount));
    } else {
      setSaveStatus(STRINGS[lang].noPendingRollover);
    }
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const handleToggleFocusMode = (enabled?: boolean) => {
    const next = typeof enabled === 'boolean' ? enabled : !focusModeActive;
    setFocusModeActive(next);
    localStorage.setItem('focusModeActive', next ? 'true' : 'false');
  };

  // Logging finished Pomodoro sessions into today's hours (usePomodoroLogging)
  const { handleLogPomodoroToCurrentHour, handleLogPomodoroSplits } = usePomodoroLogging({
    setWeekData,
    saveWeekData,
    weekStart,
    weekStartDay,
    currentUser,
    lang,
    setSaveStatus
  });

  // Keyboard shortcuts (useKeyboardShortcuts); Esc closes the top-most open window
  const handleCloseTopModal = (): boolean => {
    if (morningNudgeOpen) {
      setMorningNudgeOpen(false);
      const todayStr = isoDate(new Date());
      localStorage.setItem(`morning_nudge_seen_${todayStr}`, 'true');
      delegateStartupFocus();
      return true;
    }
    if (globalSearchOpen) { setGlobalSearchOpen(false); return true; }
    if (todoDrawerOpen) { setTodoDrawerOpen(false); return true; }
    if (authModalOpen) { setAuthModalOpen(false); return true; }
    if (settingsModalOpen) { setSettingsModalOpen(false); return true; }
    if (guideModalOpen) { setGuideModalOpen(false); return true; }
    if (chartsModalOpen) { setChartsModalOpen(false); return true; }
    if (dayDistModalOpen) { setDayDistModalOpen(false); return true; }
    if (aiSummaryModalOpen) { setAiSummaryModalOpen(false); return true; }
    if (exportModalOpen) { setExportModalOpen(false); return true; }
    if (pwaModalOpen) { setPwaModalOpen(false); return true; }
    if (ageModalOpen) { setAgeModalOpen(false); return true; }
    if (sleepOnboardModalOpen) { setSleepOnboardModalOpen(false); return true; }
    if (focusModeActive) { handleToggleFocusMode(false); return true; }
    return false;
  };

  useKeyboardShortcuts({
    closeTopModal: handleCloseTopModal,
    toggleFocusMode: () => handleToggleFocusMode(),
    toggleTodoDrawer: showTodoInbox ? () => setTodoDrawerOpen((prev) => !prev) : null,
    toggleSearch: () => setGlobalSearchOpen((prev) => !prev)
  });

  // Age badge + birthday reminder banner (1 month, 1 week, same day)
  const { bdayBannerText, ageDisplayValue, ageUnit } = getBirthdayInfo({
    showAgeBadge,
    birthDate: userBirthDate,
    ageDisplayOpt,
    lang
  });

  // Birthday celebration confetti, once per day
  useEffect(() => {
    if (!isBirthdayToday(userBirthDate)) return;
    const alreadyTriggeredKey = `bday_confetti_${isoDate(new Date())}`;
    if (sessionStorage.getItem(alreadyTriggeredKey)) return;
    sessionStorage.setItem(alreadyTriggeredKey, 'true');
    try {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } catch {
      /* confetti is decorative */
    }
  }, [userBirthDate]);

  // Calendar token-expiry listener now lives inside useCalendar.

  // Google Calendar event fetching now lives inside useCalendar.

  // Google Calendar Connection
  const handleConnectGCal = async () => {
    await loadFirebase();
    if (!auth || !googleProvider) return;
    try {
      const res = await signInWithPopup(auth, googleProvider);
      let credential: string | null = null;
      try {
        const googleCred = GoogleAuthProvider.credentialFromResult(res);
        credential = googleCred?.accessToken || null;
      } catch { }
      if (!credential) {
        // Older SDK builds only exposed the token on the raw response.
        credential = (res as unknown as { _tokenResponse?: { oauthAccessToken?: string } })._tokenResponse?.oauthAccessToken || null;
      }

      if (credential) {
        setGcalAccessToken(credential);
        sessionStorage.setItem('gcal_access_token', credential);
        setCalSyncEnabled(true);
        syncPreferences(currentUser, { calSyncEnabled: true });
        setSaveStatus(lang === 'ar' ? '🎉 تم ربط Google Calendar بنجاح' : '🎉 Google Calendar connected successfully');
        setTimeout(() => setSaveStatus(''), 4000);
      } else {
        setCalSyncEnabled(true);
        syncPreferences(currentUser, { calSyncEnabled: true });
        setSaveStatus(lang === 'ar' ? '✅ تم الاتصال بحساب Google' : '✅ Connected to Google account');
        setTimeout(() => setSaveStatus(''), 4000);
      }
    } catch (err: unknown) {
      console.warn('Google calendar connect failed:', err);
      const msg = (err as { code?: string } | null)?.code === 'auth/popup-blocked'
        ? (lang === 'ar' ? '⚠️ المتصفح حجب النافذة، يرجى السماح بالنوافذ المنبثقة' : '⚠️ Popup blocked by browser')
        : (lang === 'ar' ? '⚠️ تعذر ربط الحساب، يرجى المحاولة مرة أخرى' : '⚠️ Failed to connect account');
      setSaveStatus(msg);
      setTimeout(() => setSaveStatus(''), 4000);
    }
  };

  const handleDisconnectGCal = () => {
    setGcalAccessToken(null);
    sessionStorage.removeItem('gcal_access_token');
    clearAllCachedCalendarEvents();
    setCalSyncEnabled(false);
    syncPreferences(currentUser, { calSyncEnabled: false });
    setSaveStatus(lang === 'ar' ? 'تم فصل حساب تقويم Google' : 'Google Calendar disconnected');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Date Navigation
  const handleSelectDate = (d: Date) => {
    flushPendingSaveNow(true);
    setCurrentDate(d);
    const newWs = startOfWeekFor(d, weekStartDay);
    if (isoDate(newWs) !== isoDate(weekStart)) {
      setWeekStart(newWs);
      loadWeekData(newWs, currentUser);
    }
  };

  const handleNavigateToDate = (dateStr: string) => {
    if (!dateStr) return;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (!isNaN(d.getTime())) {
        handleSelectDate(d);
      }
    }
  };

  const handleOffsetWeek = (offset: number) => {
    flushPendingSaveNow(true);
    const newWs = addDays(weekStart, offset * 7);
    const newCd = addDays(currentDate, offset * 7);
    setWeekStart(newWs);
    setCurrentDate(newCd);
    loadWeekData(newWs, currentUser);
  };

  const handleResetToday = () => {
    flushPendingSaveNow(true);
    const today = new Date();
    setCurrentDate(today);
    const newWs = startOfWeekFor(today, weekStartDay);
    setWeekStart(newWs);
    loadWeekData(newWs, currentUser);
    focusCurrentHourInput();
  };

  const handleChangeWeekStartDay = (newDay: WeekStartDay) => {
    flushPendingSaveNow(false);
    setWeekStartDay(newDay);
    localStorage.setItem('weekStartDay', newDay);
    const newWs = startOfWeekFor(currentDate, newDay);
    setWeekStart(newWs);
    loadWeekData(newWs, currentUser);
    syncPreferences(currentUser, { weekStartDay: newDay });
    setSaveStatus(lang === 'ar' ? '✓ تم تغيير بداية الأسبوع' : '✓ Week start day updated');
    setTimeout(() => setSaveStatus(''), 2000);
  };


  return (
    <div className="max-w-4xl mx-auto px-3 py-3 md:py-6 pb-20 select-text">
      {/* Birthday Reminder Banner */}
      {bdayBannerText && (
        <div className="bday-banner bg-gradient-to-r from-[var(--amber-tint)] to-amber-100 border border-[var(--amber)] text-[var(--teal-dark)] rounded-2xl py-2 px-4 text-xs font-black text-center mb-3 shadow-sm">
          {bdayBannerText}
        </div>
      )}

      {/* Header */}
      <Header
        currentDate={currentDate}
        onSelectDate={handleSelectDate}
        loggedCount={activeLoggedCount}
        totalActiveHours={activeHoursKeys.length}
        onOpenDayDist={() => setDayDistModalOpen(true)}
        userBirthDate={userBirthDate}
        ageDisplayOpt={ageDisplayOpt}
        streak={dailyStreak}
        streakHasToday={streakHasToday}
        showStreak={showStreakBadge}
        weekStartDay={weekStartDay}
        isDetailedView={isDetailedView}
        onToggleDetailedView={handleToggleDetailedView}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onSignOut={() => {
          if (auth) signOut(auth);
          localStorage.removeItem('timelog_last_uid');
          setCurrentUser(null);
          loadWeekData(weekStart, null);
        }}
        onOpenSettings={() => setSettingsModalOpen(true)}
        darkMode={isDarkEffective}
        onToggleDarkMode={handleCycleThemeMode}
        themeMode={themeMode}
        isDarkEffective={isDarkEffective}
        onCycleThemeMode={handleCycleThemeMode}
        lang={lang}
        onToggleLang={() => {
          const next = lang === 'ar' ? 'en' : 'ar';
          setLang(next);
          localStorage.setItem('lang', next);
        }}
        saveStatus={saveStatus}
        onOpenSearch={() => setGlobalSearchOpen(true)}
        onOpenTodoInbox={showTodoInbox ? () => setTodoDrawerOpen(true) : undefined}
        todoCount={todoInbox.filter((t) => !t.done).length}
      />

      {/* Detailed View: Week Navigator + Tag Rings */}
      {isDetailedView && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3.5 animate-in fade-in">
          <WeekNavigator
            weekStart={weekStart}
            currentDate={currentDate}
            weekData={weekData}
            onSelectDate={handleSelectDate}
            onOffsetWeek={handleOffsetWeek}
            onResetToday={handleResetToday}
            activeHoursKeys={activeHoursKeys}
            lang={lang}
          />

          <TagRingsOverview
            tagCounts={tagCounts}
            totalSlots={activeHoursKeys.length}
            onOpenCharts={() => setChartsModalOpen(true)}
            hideSleepTag={sleepSettings.enabled}
            tagTargets={tagTargets}
            lang={lang}
          />
        </div>
      )}

      {/* Advanced Tools Toolbar (when enabled) */}
      {devToolsEnabled && (
        <ToolsBar
          lang={lang}
          onOpenSummary={() => setAiSummaryModalOpen(true)}
          onOpenCharts={() => setChartsModalOpen(true)}
          onOpenExport={() => setExportModalOpen(true)}
        />
      )}

      {/* Main Sections Grid */}
      <div className="flex flex-col gap-3.5">
        {/* Hours Logging Card */}
        <section className="bg-[var(--card)] border border-[var(--line)] rounded-xl p-3.5 md:p-4 shadow-xs">
          <HoursSectionHeader
            lang={lang}
            showStreakBadge={showStreakBadge}
            dailyStreak={dailyStreak}
            showFocusButton={isToday && showFocusModeButton}
            focusModeActive={focusModeActive}
            pomoBgState={pomoBgState}
            onToggleFocusMode={handleToggleFocusMode}
            ageDisplayValue={ageDisplayValue}
            ageUnit={ageUnit}
            onOpenSettings={() => setSettingsModalOpen(true)}
            loggedCount={activeLoggedCount}
            totalActiveHours={activeHoursKeys.length}
            showFocusBanner={focusModeActive && isToday}
          />

          {/* 24 Hours List & Periods */}
          <HoursList
            hoursData={currentDayData.hours}
            onChangeHour={handleChangeHour}
            onCopyDown={handleCopyDown}
            sleepSettings={sleepSettings}
            isSleepExceptionToday={isSleepExceptionToday}
            onToggleSleepException={handleToggleSleepException}
            sleepHourKeys={sleepHourKeys}
            isToday={isToday}
            googleCalendarEvents={googleCalendarEvents}
            onBatchApplyCalendarEvents={handleBatchApplyCalendarEvents}
            onDismissCalendarEvent={(k) => {
              const updated = { ...dismissedSuggestions, [`${dateStr}_${k}`]: true };
              setDismissedSuggestions(updated);
              localStorage.setItem('dismissedSuggestions', JSON.stringify(updated));
            }}
            hasGoldenGoal={!!(currentDayData.goldenGoal.text && currentDayData.goldenGoal.text.trim() !== '')}
            isFocusMode={focusModeActive}
            lang={lang}
          />
        </section>

        {/* Priority Matrix & Golden Goal (Optional / Individually Configurable from Settings) */}
        {showPrioritiesSection && (
          <PrioritiesSection
            goldenGoal={currentDayData.goldenGoal}
            onChangeGoldenGoal={handleChangeGoldenGoal}
            priorities={currentDayData.priorities}
            onChangePriorities={handleChangePriorities}
            onPromoteToGolden={handlePromoteToGolden}
            onRollover={handleRollover}
            onOpenTodoInbox={showTodoInbox ? () => setTodoDrawerOpen(true) : undefined}
            todoCount={todoInbox.filter((t) => !t.done).length}
            showGoldenGoal={showGoldenGoal}
            showPriorityMatrix={showPriorityMatrix}
            lang={lang}
          />
        )}

        {/* Tag Categories Legend */}
        <TagLegend lang={lang} hideSleepTag={sleepSettings.enabled} />
      </div>

      <AppFooter lang={lang} />

      {/* All Modals */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        sleepSettings={sleepSettings}
        onChangeSleepSettings={(s) => {
          setSleepSettings(s);
          syncPreferences(currentUser, { sleepWindow: s });
        }}
        userBirthDate={userBirthDate}
        ageDisplayOpt={ageDisplayOpt}
        showAgeBadge={showAgeBadge}
        onToggleAgeBadge={(en) => {
          setShowAgeBadge(en);
          syncPreferences(currentUser, { showAgeBadge: en });
        }}
        onSaveAge={(bDate, opt) => {
          setUserBirthDate(bDate);
          setAgeDisplayOpt(opt);
          syncPreferences(currentUser, { birthDate: bDate, ageDisplayOpt: opt });
        }}
        weekStartDay={weekStartDay}
        onChangeWeekStartDay={handleChangeWeekStartDay}
        isDetailedView={isDetailedView}
        onToggleDetailedView={handleToggleDetailedView}
        devToolsEnabled={devToolsEnabled}
        onToggleDevTools={(en) => {
          setDevToolsEnabled(en);
          syncPreferences(currentUser, { devToolsEnabled: en });
        }}
        showStreakBadge={showStreakBadge}
        onToggleStreakBadge={(en) => {
          setShowStreakBadge(en);
          syncPreferences(currentUser, { showStreakBadge: en });
        }}
        showFocusModeButton={showFocusModeButton}
        onToggleShowFocusModeButton={(en) => {
          setShowFocusModeButton(en);
          if (!en) setFocusModeActive(false);
          syncPreferences(currentUser, { showFocusModeButton: en });
        }}
        showGoldenGoal={showGoldenGoal}
        onToggleShowGoldenGoal={(en) => updatePlanningVisibility({ showGoldenGoal: en })}
        showPriorityMatrix={showPriorityMatrix}
        onToggleShowPriorityMatrix={(en) => updatePlanningVisibility({ showPriorityMatrix: en })}
        showTodoInbox={showTodoInbox}
        onToggleShowTodoInbox={(en) => updatePlanningVisibility({ showTodoInbox: en })}
        onToggleAllPlanningSuite={(en) =>
          updatePlanningVisibility({ showGoldenGoal: en, showPriorityMatrix: en, showTodoInbox: en })
        }
        morningNudgeEnabled={morningNudgeEnabled}
        onToggleMorningNudge={(en) => {
          setMorningNudgeEnabled(en);
          syncPreferences(currentUser, { morningNudgeEnabled: en });
        }}
        eveningWrapUpEnabled={eveningWrapUpEnabled}
        onToggleEveningWrapUp={(en) => {
          setEveningWrapUpEnabled(en);
          syncPreferences(currentUser, { eveningWrapUpEnabled: en });
        }}
        tagTargets={tagTargets}
        onChangeTagTargets={(targets) => {
          setTagTargets(targets);
          syncPreferences(currentUser, { tagTargets: targets });
        }}
        isCalSyncConnected={!!gcalAccessToken}
        currentUserEmail={currentUser?.email}
        onConnectGCal={handleConnectGCal}
        onDisconnectGCal={handleDisconnectGCal}
        calSyncEnabled={calSyncEnabled}
        onToggleCalSync={(en) => {
          setCalSyncEnabled(en);
          syncPreferences(currentUser, { calSyncEnabled: en });
        }}
        autoCloudSync={autoCloudSync}
        onToggleAutoCloudSync={(en) => {
          setAutoCloudSync(en);
          syncPreferences(currentUser, { autoCloudSync: en });
        }}
        onSyncAllToCloudNow={handleSyncAllWeeksNow}
        isSyncingAllWeeks={isSyncingAllWeeks}
        isUserLoggedIn={!!currentUser}
        onBeforeDeleteData={discardPendingSave}
        onOpenPwaModal={() => setPwaModalOpen(true)}
        onOpenGuide={() => setGuideModalOpen(true)}
        darkMode={isDarkEffective}
        onToggleDarkMode={handleCycleThemeMode}
        themeMode={themeMode}
        isDarkEffective={isDarkEffective}
        onChangeThemeMode={handleChangeThemeMode}
        themePalette={themePalette}
        onChangeThemePalette={handleChangeThemePalette}
        lang={lang}
        onToggleLang={() => {
          const next = lang === 'ar' ? 'en' : 'ar';
          setLang(next);
          localStorage.setItem('lang', next);
        }}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => loadWeekData(weekStart, auth?.currentUser || null)}
        lang={lang}
      />

      <DayDistModal
        isOpen={dayDistModalOpen}
        onClose={() => setDayDistModalOpen(false)}
        currentDate={currentDate}
        tagCounts={tagCounts}
        unassignedCount={unassignedCount}
        emptyCount={emptyHoursCount}
        totalSlots={activeHoursKeys.length}
        loggedTotal={activeLoggedCount}
        hideSleepTag={sleepSettings.enabled}
        tagTargets={tagTargets}
        lang={lang}
      />

      <ChartsModal
        isOpen={chartsModalOpen}
        onClose={() => setChartsModalOpen(false)}
        weekStart={weekStart}
        weekData={weekData}
        activeHoursKeys={activeHoursKeys}
        hideSleepTag={sleepSettings.enabled}
        lang={lang}
      />

      <AiSummaryModal
        isOpen={aiSummaryModalOpen}
        onClose={() => setAiSummaryModalOpen(false)}
        currentDate={currentDate}
        dayData={currentDayData}
        sleepSettings={sleepSettings}
        activeHoursKeys={activeHoursKeys}
        lang={lang}
      />

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        currentDate={currentDate}
        weekStart={weekStart}
        weekData={weekData}
        activeHoursKeys={activeHoursKeys}
        sleepSettings={sleepSettings}
        uid={currentUser?.uid ?? null}
        onImportBackup={(imported) => {
          setWeekData(imported);
          saveWeekData(imported, weekStart, currentUser, true);
        }}
        onImportFullBackup={(backup: FullBackup) => {
          restoreFullBackup(backup, {
            uid: currentUser?.uid ?? null,
            onWeekRestored: (monKey, weekDataRestored) => {
              // Optionally push to Firestore if logged in
              if (db && currentUser) {
                const docRef = doc(db, 'artifacts', 'time-log-app', 'users', currentUser.uid, 'weeks', monKey);
                setDoc(docRef, { json: JSON.stringify(weekDataRestored), updatedAt: new Date().toISOString() }).catch(() => { });
              }
            },
            onInboxRestored: (items) => saveTodoInbox(items),
            onPrefsRestored: (prefs) => {
              // Apply all restored preferences to React state
              if (prefs.tagTargets) setTagTargets(prefs.tagTargets);
              if (prefs.sleepSettings) setSleepSettings(prefs.sleepSettings);
              if (prefs.weekStartDay) setWeekStartDay(prefs.weekStartDay);
              if (prefs.themeMode) setThemeMode(prefs.themeMode);
              if (prefs.themePalette) setThemePalette(prefs.themePalette);
              if (prefs.lang) setLang(prefs.lang);
              if (prefs.birthDate) setUserBirthDate(prefs.birthDate);
              if (prefs.ageDisplayOpt) setAgeDisplayOpt(prefs.ageDisplayOpt);
              setIsDetailedView(prefs.isDetailedView ?? false);
              setShowStreakBadge(prefs.showStreakBadge ?? true);
              setShowAgeBadge(prefs.showAgeBadge ?? false);
              setShowFocusModeButton(prefs.showFocusModeButton ?? false);
              setShowGoldenGoal(prefs.showGoldenGoal ?? true);
              setShowPriorityMatrix(prefs.showPriorityMatrix ?? true);
              setShowTodoInbox(prefs.showTodoInbox ?? true);
              setMorningNudgeEnabled(prefs.morningNudgeEnabled ?? false);
              setEveningWrapUpEnabled(prefs.eveningWrapUpEnabled ?? false);
              // Reload current week from the restored localStorage
              loadWeekData(weekStart, currentUser);
            },
          });
        }}
        lang={lang}
      />

      <SleepOnboardModal
        isOpen={sleepOnboardModalOpen}
        onClose={() => setSleepOnboardModalOpen(false)}
        onApply={(s) => {
          setSleepSettings(s);
          syncPreferences(currentUser, { sleepWindow: s });
        }}
        onSkip={() => {
          const next = { ...sleepSettings, enabled: false, onboarded: true };
          setSleepSettings(next);
          syncPreferences(currentUser, { sleepWindow: next });
        }}
        lang={lang}
      />

      <AgeSettingsModal
        isOpen={ageModalOpen}
        onClose={() => setAgeModalOpen(false)}
        userBirthDate={userBirthDate}
        ageDisplayOpt={ageDisplayOpt}
        onSave={(bDate, opt) => {
          setUserBirthDate(bDate);
          setAgeDisplayOpt(opt);
          syncPreferences(currentUser, { birthDate: bDate, ageDisplayOpt: opt });
        }}
        lang={lang}
      />

      <PwaModal
        isOpen={pwaModalOpen}
        onClose={() => setPwaModalOpen(false)}
        lang={lang}
      />

      <GuideModal
        isOpen={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
        lang={lang}
      />

      {/* Immersive Pomodoro Focus Mode View */}
      <FocusPomodoroView
        isOpen={focusModeActive}
        onClose={() => handleToggleFocusMode(false)}
        onRequestOpen={() => handleToggleFocusMode(true)}
        onTimerStateChange={setPomoBgState}
        onLogToCurrentHour={handleLogPomodoroToCurrentHour}
        onLogPomodoroSplits={handleLogPomodoroSplits}
        goldenGoalText={currentDayData.goldenGoal.text}
        themeMode={themeMode}
        isDarkEffective={isDarkEffective}
        onCycleThemeMode={handleCycleThemeMode}
        lang={lang}
      />


      {/* Brain Dump & Todo Inbox Slide-over Drawer */}
      <TodoInboxDrawer
        isOpen={todoDrawerOpen}
        onClose={() => setTodoDrawerOpen(false)}
        todos={todoInbox}
        onAddTodo={handleAddTodo}
        onToggleTodo={handleToggleTodo}
        onDeleteTodo={handleDeleteTodo}
        onPromoteToGolden={handlePromoteTodoToGolden}
        onPromoteToQuad={handlePromoteTodoToQuad}
        lang={lang}
      />

      {/* Evening Wrap-up — light review of the day that ended (offered from 05:00) */}
      <EveningWrapUpModal
        isOpen={eveningWrapUpOpen}
        dayLabel={wrapUpDayLabel}
        summary={wrapUpSummary}
        lang={lang}
        onClose={handleCloseEveningWrapUp}
        onViewDay={wrapUpDayKey ? () => handleNavigateToDate(wrapUpDayKey) : undefined}
      />

      {/* Morning Nudge Mindful Dialog */}
      <MorningNudgeModal
        isOpen={morningNudgeOpen}
        onClose={() => {
          setMorningNudgeOpen(false);
          const todayStr = isoDate(new Date());
          localStorage.setItem(`morning_nudge_seen_${todayStr}`, 'true');
          delegateStartupFocus();
        }}
        yesterdayData={yesterdayNudgeData}
        tagTargets={tagTargets}
        lang={lang}
      />

      {/* Global Search across all historical weeks */}
      <GlobalSearchModal
        isOpen={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        uid={currentUser?.uid ?? null}
        lang={lang}
        onNavigateToDate={handleNavigateToDate}
      />

      {/* Floating Save Toast Notification */}
      <SaveToast status={saveStatus} />

      {/* New-version prompt when a Service Worker update is waiting */}
      <UpdateToast />
    </div>
  );
}
