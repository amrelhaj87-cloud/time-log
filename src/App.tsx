import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { User } from 'firebase/auth';
import { auth, db, doc, setDoc, getDoc, onSnapshot, signOut, signInWithPopup, googleProvider, GoogleAuthProvider, Capacitor, onAuthStateChanged, loadFirebase } from './services/firebase';
import {
  TagCode,
  GoalItem,
  TodoItem,
  DayData,
  WeekData,
  WeekStartDay
} from './types';
import {
  STRINGS,
  APP_VERSION
} from './constants/config';
import {
  startOfWeekFor,
  mondayOf,
  isoDate,
  addDays,
  emptyDay,
  getCurrentHourKey,
  normalizeWeekData,
  focusCurrentHourInput,
  PomodoroSplit
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

// Modals — lazy-loaded on demand so their code stays out of the initial bundle.
// The gate renders a modal only when its `isOpen` prop is true, which means the
// dynamic import (and its chunk download) only happens the first time it is opened.
// FocusPomodoroView stays eagerly imported because it must remain mounted so the
// background timer keeps running even while its window is minimized.
import { FocusPomodoroView } from './components/FocusPomodoroView';

const makeLazyModal = (
  loader: () => Promise<any>,
  exportName: string
) => {
  const LazyModal = React.lazy(() =>
    loader().then((m) => ({ default: m[exportName] as React.ComponentType<any> }))
  );
  return function LazyModalGate(props: { isOpen?: boolean } & Record<string, any>) {
    if (!props.isOpen) return null;
    return (
      <React.Suspense fallback={null}>
        <LazyModal {...props} />
      </React.Suspense>
    );
  };
};

const AuthModal = makeLazyModal(() => import('./components/Modals/AuthModal'), 'AuthModal');
const DayDistModal = makeLazyModal(() => import('./components/Modals/DayDistModal'), 'DayDistModal');
const ChartsModal = makeLazyModal(() => import('./components/Modals/ChartsModal'), 'ChartsModal');
const AiSummaryModal = makeLazyModal(() => import('./components/Modals/AiSummaryModal'), 'AiSummaryModal');
const ExportModal = makeLazyModal(() => import('./components/Modals/ExportModal'), 'ExportModal');
const SleepOnboardModal = makeLazyModal(() => import('./components/Modals/SleepOnboardModal'), 'SleepOnboardModal');
const AgeSettingsModal = makeLazyModal(() => import('./components/Modals/AgeSettingsModal'), 'AgeSettingsModal');
const PwaModal = makeLazyModal(() => import('./components/Modals/PwaModal'), 'PwaModal');
const SettingsModal = makeLazyModal(() => import('./components/Modals/SettingsModal'), 'SettingsModal');
const GuideModal = makeLazyModal(() => import('./components/Modals/GuideModal'), 'GuideModal');
const TodoInboxDrawer = makeLazyModal(() => import('./components/Modals/TodoInboxDrawer'), 'TodoInboxDrawer');
const MorningNudgeModal = makeLazyModal(() => import('./components/Modals/MorningNudgeModal'), 'MorningNudgeModal');
const EveningWrapUpModal = makeLazyModal(() => import('./components/Modals/EveningWrapUpModal'), 'EveningWrapUpModal');
const GlobalSearchModal = makeLazyModal(() => import('./components/Modals/GlobalSearchModal'), 'GlobalSearchModal');

import { Sparkles, BarChart3, Download, Flame, Cake, Target } from 'lucide-react';

export default function App() {
  // 0. Brain Dump & Todo Inbox State
  const [todoInbox, setTodoInbox] = useState<TodoItem[]>(() => {
    try {
      const local = localStorage.getItem('time_log_todo_inbox');
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  });
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

  // Real-time synchronization of Brain Dump / Todo Inbox with Firestore
  useEffect(() => {
    if (!db || !currentUser) return;
    try {
      const docRef = doc(db, 'artifacts', 'time-log-app', 'users', currentUser.uid, 'inbox', 'todos');
      const unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data && Array.isArray(data.items)) {
              setTodoInbox(data.items);
              localStorage.setItem('time_log_todo_inbox', JSON.stringify(data.items));
            }
          }
        },
        (err) => {
          console.warn('Error syncing todo inbox from Firestore:', err);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn('Failed to attach todo inbox listener:', err);
    }
  }, [currentUser]);

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
    flushPendingSaveNow
  } = useWeekPersistence(lang);

  // 3-State Theme Mode (extracted to useTheme)
  const {
    themeMode,
    setThemeMode,
    isDarkEffective,
    handleCycleThemeMode,
    handleChangeThemeMode
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

  // Calculate Tag Counts & Logged items for active hours
  const tagCounts: Record<TagCode, number> = { E: 0, V: 0, R: 0, S: 0, SC: 0, SL: 0, '': 0 };
  let activeLoggedCount = 0;
  let unassignedCount = 0;
  let emptyHoursCount = 0;

  activeHoursKeys.forEach((key) => {
    const entry = currentDayData.hours[key];
    if (entry && entry.text && entry.text.trim() !== '') {
      activeLoggedCount++;
      if (entry.tag && tagCounts[entry.tag] !== undefined) {
        tagCounts[entry.tag]++;
      } else {
        unassignedCount++;
      }
    } else {
      emptyHoursCount++;
    }
  });

  // Calculate Daily Streak from weekData and cached localStorage days
  const allDaysHours: Record<string, typeof currentDayData.hours> = {};
  const allDaysGolden: Record<string, typeof currentDayData.goldenGoal> = {};
  Object.keys(weekData.days).forEach((dk) => {
    allDaysHours[dk] = weekData.days[dk].hours;
    allDaysGolden[dk] = weekData.days[dk].goldenGoal;
  });
  // Also scan any other cached local weeks
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('time_log_week_')) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.days) {
            Object.keys(parsed.days).forEach((dk) => {
              allDaysHours[dk] = parsed.days[dk].hours;
              allDaysGolden[dk] = parsed.days[dk].goldenGoal;
            });
          }
        }
      }
    }
  } catch { }
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
      unsub = onAuthStateChanged(auth, async (u) => {
      setCurrentUser(u);
      if (u) localStorage.setItem('timelog_last_uid', u.uid);
      let targetWs = weekStartRef.current;

      if (u) {
        // Load user preferences from Firestore if available
        try {
          const docRef = doc(db!, 'users', u.uid, 'settings', 'preferences');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data.sleepWindow) setSleepSettings(data.sleepWindow);
            if (data.birthDate) setUserBirthDate(data.birthDate);
            if (data.ageDisplayOpt) setAgeDisplayOpt(data.ageDisplayOpt);
            if (data.themeMode) {
              setThemeMode(data.themeMode);
              localStorage.setItem('themeMode', data.themeMode);
            }
            if (data.isDetailedView !== undefined) {
              setIsDetailedView(data.isDetailedView);
              localStorage.setItem('isDetailedView', String(data.isDetailedView));
            }
            if (data.devToolsEnabled !== undefined) setDevToolsEnabled(data.devToolsEnabled);
            if (data.showAgeBadge !== undefined) setShowAgeBadge(data.showAgeBadge);
            if (data.showStreakBadge !== undefined) setShowStreakBadge(data.showStreakBadge);
            if (data.showFocusModeButton !== undefined) setShowFocusModeButton(data.showFocusModeButton);
            if (data.showGoldenGoal !== undefined) {
              setShowGoldenGoal(data.showGoldenGoal);
              localStorage.setItem('showGoldenGoal', String(data.showGoldenGoal));
            } else if (data.showPrioritiesSection !== undefined) {
              setShowGoldenGoal(data.showPrioritiesSection);
              localStorage.setItem('showGoldenGoal', String(data.showPrioritiesSection));
            }
            if (data.showPriorityMatrix !== undefined) {
              setShowPriorityMatrix(data.showPriorityMatrix);
              localStorage.setItem('showPriorityMatrix', String(data.showPriorityMatrix));
            } else if (data.showPrioritiesSection !== undefined) {
              setShowPriorityMatrix(data.showPrioritiesSection);
              localStorage.setItem('showPriorityMatrix', String(data.showPrioritiesSection));
            }
            if (data.showTodoInbox !== undefined) {
              setShowTodoInbox(data.showTodoInbox);
              localStorage.setItem('showTodoInbox', String(data.showTodoInbox));
            }
            if (data.morningNudgeEnabled !== undefined) {
              setMorningNudgeEnabled(data.morningNudgeEnabled);
              localStorage.setItem('morningNudgeEnabled', String(data.morningNudgeEnabled));
            }
            if (data.eveningWrapUpEnabled !== undefined) {
              setEveningWrapUpEnabled(data.eveningWrapUpEnabled);
              localStorage.setItem('eveningWrapUpEnabled', String(data.eveningWrapUpEnabled));
            }
            if (data.tagTargets) {
              setTagTargets(data.tagTargets);
              localStorage.setItem('tagTargets', JSON.stringify(data.tagTargets));
            }
            if (data.calSyncEnabled !== undefined) setCalSyncEnabled(data.calSyncEnabled);
            if (data.autoCloudSync !== undefined) {
              setAutoCloudSync(data.autoCloudSync);
              localStorage.setItem('autoCloudSync', String(data.autoCloudSync));
            }
            if (data.weekStartDay) {
              setWeekStartDay(data.weekStartDay);
              localStorage.setItem('weekStartDay', data.weekStartDay);
              const computedWs = startOfWeekFor(currentDateRef.current, data.weekStartDay);
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

  // Brain Dump & Todo Inbox Handlers
  const saveTodoInbox = useCallback(
    (items: TodoItem[]) => {
      setTodoInbox(items);
      localStorage.setItem('time_log_todo_inbox', JSON.stringify(items));
      if (db && currentUser) {
        try {
          const docRef = doc(db, 'artifacts', 'time-log-app', 'users', currentUser.uid, 'inbox', 'todos');
          setDoc(docRef, { items, updatedAt: new Date().toISOString() });
        } catch (err) {
          console.warn('Failed to sync todo inbox to Firestore:', err);
        }
      }
    },
    [currentUser]
  );

  const handleAddTodo = (text: string, tag: TagCode) => {
    const newItem: TodoItem = {
      id: `todo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      text,
      tag,
      done: false,
      createdAt: Date.now()
    };
    const updated = [newItem, ...todoInbox];
    saveTodoInbox(updated);
    setSaveStatus(lang === 'ar' ? '✨ تمت إضافة الفكرة للصندوق' : '✨ Added to Brain Dump Inbox');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleToggleTodo = (id: string) => {
    const updated = todoInbox.map((item) => {
      if (item.id === id) {
        const nextDone = !item.done;
        return {
          ...item,
          done: nextDone,
          promotedTo: nextDone ? item.promotedTo : undefined,
          promotedQuad: nextDone ? item.promotedQuad : undefined
        };
      }
      return item;
    });
    saveTodoInbox(updated);
  };

  const handleDeleteTodo = (id: string) => {
    const updated = todoInbox.filter((item) => item.id !== id);
    saveTodoInbox(updated);
  };

  const handlePromoteTodoToGolden = (todo: TodoItem) => {
    handleChangeGoldenGoal({ text: todo.text, done: false, tag: (todo.tag || '') as TagCode }, true);
    const updated = todoInbox.map((item) =>
      item.id === todo.id
        ? {
          ...item,
          done: true,
          promotedTo: 'golden' as const,
          promotedAt: Date.now()
        }
        : item
    );
    saveTodoInbox(updated);
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
      const updated = todoInbox.map((item) =>
        item.id === todo.id
          ? {
            ...item,
            done: true,
            promotedTo: 'quad' as const,
            promotedQuad: quadKey,
            promotedAt: Date.now()
          }
          : item
      );
      saveTodoInbox(updated);
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

    const updated = todoInbox.map((item) =>
      item.id === todo.id
        ? {
          ...item,
          done: true,
          promotedTo: 'quad' as const,
          promotedQuad: quadKey,
          promotedAt: Date.now()
        }
        : item
    );
    saveTodoInbox(updated);
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
    const updatedDays = { ...weekData.days };
    const tomorrowDay = updatedDays[tomorrowStr] || emptyDay();

    let movedCount = 0;

    // 1. Roll over incomplete Golden Goal
    if (
      currentDayData.goldenGoal &&
      currentDayData.goldenGoal.text &&
      currentDayData.goldenGoal.text.trim() !== '' &&
      !currentDayData.goldenGoal.done
    ) {
      const cleanGolden = currentDayData.goldenGoal.text.trim();
      if (!tomorrowDay.goldenGoal.text || tomorrowDay.goldenGoal.text.trim() === '') {
        tomorrowDay.goldenGoal = {
          text: cleanGolden,
          done: false,
          tag: currentDayData.goldenGoal.tag || ''
        };
        movedCount++;
      } else if (tomorrowDay.goldenGoal.text.trim() !== cleanGolden) {
        // If tomorrow's golden goal is already occupied, ensure it's transferred to Q1
        const tomorrowQ1 = tomorrowDay.priorities.q1 || [];
        const existsInQ1 = tomorrowQ1.some((t) => t.text.trim() === cleanGolden);
        if (!existsInQ1) {
          const emptyIdx = tomorrowQ1.findIndex((t) => (!t.text || t.text.trim() === '') && !t.done);
          if (emptyIdx !== -1) {
            tomorrowQ1[emptyIdx] = { text: cleanGolden, done: false, tag: currentDayData.goldenGoal.tag || '' };
          } else {
            tomorrowQ1.push({ text: cleanGolden, done: false, tag: currentDayData.goldenGoal.tag || '' });
          }
          tomorrowDay.priorities.q1 = tomorrowQ1;
          movedCount++;
        }
      }
    }

    // 2. Roll over incomplete items from the 4 priority quadrants (Q1, Q2, Q3, Q4)
    (['q1', 'q2', 'q3', 'q4'] as const).forEach((q) => {
      const todayList = currentDayData.priorities[q] || [];
      const tomorrowList = [...(tomorrowDay.priorities[q] || [])];

      todayList.forEach((item) => {
        if (item.text && item.text.trim() !== '' && !item.done) {
          const cleanText = item.text.trim();
          const exists = tomorrowList.some((t) => t.text.trim() === cleanText);
          if (!exists) {
            const emptyIdx = tomorrowList.findIndex((t) => (!t.text || t.text.trim() === '') && !t.done);
            if (emptyIdx !== -1) {
              tomorrowList[emptyIdx] = { text: cleanText, done: false, tag: item.tag || '' };
            } else {
              tomorrowList.push({ text: cleanText, done: false, tag: item.tag || '' });
            }
            movedCount++;
          }
        }
      });
      tomorrowDay.priorities[q] = tomorrowList.length > 0 ? tomorrowList : [{ text: '', done: false, tag: '' }];
    });

    updatedDays[tomorrowStr] = tomorrowDay;
    const newWeek = { ...weekData, days: updatedDays };
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

  const handleLogPomodoroToCurrentHour = (
    text: string,
    minutes: number,
    tag: TagCode,
    updateTagOnly = false
  ) => {
    const now = new Date();
    const todayStr = isoDate(now);
    const currentKey = getCurrentHourKey();
    const prefix = `[🎯 ${minutes}m] `;

    // Always log to TODAY's date (now), regardless of which day the user is currently browsing!
    setWeekData((prevWeek) => {
      const todayDay = prevWeek.days[todayStr];
      if (todayDay) {
        const existing = todayDay.hours[currentKey] || { text: '', tag: '' };
        const updatedText = updateTagOnly
          ? (existing.text.trim() ? existing.text : `${prefix}${text}`)
          : existing.text.trim()
            ? `${existing.text} • ${prefix}${text}`
            : `${prefix}${text}`;
        const updatedDay: DayData = {
          ...todayDay,
          hours: {
            ...todayDay.hours,
            [currentKey]: { text: updatedText, tag: tag || (existing.tag as TagCode) || 'E' }
          }
        };
        const newWeek: WeekData = {
          ...prevWeek,
          days: {
            ...prevWeek.days,
            [todayStr]: updatedDay
          }
        };
        saveWeekData(newWeek, weekStart, currentUser, true);
        return newWeek;
      } else {
        // If the user navigated to an entirely different week, save to today's week in background
        const todayWs = startOfWeekFor(now, weekStartDay);
        const todayMonKey = isoDate(mondayOf(todayWs));
        const userPrefix = currentUser ? currentUser.uid : 'guest';
        const targetLocalKey = `time_log_week_${userPrefix}_${todayMonKey}`;
        let targetWeek: WeekData = { days: {} };
        const raw = localStorage.getItem(targetLocalKey);
        if (raw) {
          try { targetWeek = JSON.parse(raw); } catch { }
        }
        targetWeek = normalizeWeekData(targetWeek, todayWs);
        const existingDay = targetWeek.days[todayStr] || emptyDay();
        const existing = existingDay.hours[currentKey] || { text: '', tag: '' };
        const updatedText = updateTagOnly
          ? (existing.text.trim() ? existing.text : `${prefix}${text}`)
          : existing.text.trim()
            ? `${existing.text} • ${prefix}${text}`
            : `${prefix}${text}`;
        targetWeek.days[todayStr] = {
          ...existingDay,
          hours: {
            ...existingDay.hours,
            [currentKey]: { text: updatedText, tag: tag || (existing.tag as TagCode) || 'E' }
          }
        };
        saveWeekData(targetWeek, todayWs, currentUser, true);
        return prevWeek;
      }
    });

    setSaveStatus(
      lang === 'ar'
        ? `✅ تم تسجيل ${minutes} دقيقة تركيز في تاريخ اليوم (${currentKey})`
        : `✅ Logged ${minutes}m focus session to today (${currentKey})`
    );
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Fix 3: تسجيل جلسة البومودورو الموزعة ذكياً بين الساعات (بلوكات ١٥ دقيقة)
  const handleLogPomodoroSplits = (
    text: string,
    splits: PomodoroSplit[],
    tag: TagCode
  ) => {
    if (!splits || splits.length === 0) return;
    const now = new Date();
    const todayStr = isoDate(now);

    setWeekData((prevWeek) => {
      const todayDay = prevWeek.days[todayStr];
      if (todayDay) {
        const updatedHours = { ...todayDay.hours };
        for (const split of splits) {
          const prefix = `[🎯 ${split.minutes}m] `;
          const existing = updatedHours[split.hourKey] || { text: '', tag: '' };
          const updatedText = existing.text.trim()
            ? `${existing.text} • ${prefix}${text}`
            : `${prefix}${text}`;
          updatedHours[split.hourKey] = {
            text: updatedText,
            tag: tag || (existing.tag as TagCode) || 'E'
          };
        }
        const updatedDay: DayData = {
          ...todayDay,
          hours: updatedHours
        };
        const newWeek: WeekData = {
          ...prevWeek,
          days: {
            ...prevWeek.days,
            [todayStr]: updatedDay
          }
        };
        saveWeekData(newWeek, weekStart, currentUser, true);
        return newWeek;
      } else {
        const todayWs = startOfWeekFor(now, weekStartDay);
        const todayMonKey = isoDate(mondayOf(todayWs));
        const userPrefix = currentUser ? currentUser.uid : 'guest';
        const targetLocalKey = `time_log_week_${userPrefix}_${todayMonKey}`;
        let targetWeek: WeekData = { days: {} };
        const raw = localStorage.getItem(targetLocalKey);
        if (raw) {
          try { targetWeek = JSON.parse(raw); } catch { }
        }
        targetWeek = normalizeWeekData(targetWeek, todayWs);
        const existingDay = targetWeek.days[todayStr] || emptyDay();
        const updatedHours = { ...existingDay.hours };
        for (const split of splits) {
          const prefix = `[🎯 ${split.minutes}m] `;
          const existing = updatedHours[split.hourKey] || { text: '', tag: '' };
          const updatedText = existing.text.trim()
            ? `${existing.text} • ${prefix}${text}`
            : `${prefix}${text}`;
          updatedHours[split.hourKey] = {
            text: updatedText,
            tag: tag || (existing.tag as TagCode) || 'E'
          };
        }
        targetWeek.days[todayStr] = {
          ...existingDay,
          hours: updatedHours
        };
        saveWeekData(targetWeek, todayWs, currentUser, true);
        return prevWeek;
      }
    });

    const summaryStr = splits
      .map((s) => (lang === 'ar' ? `${s.minutes}د في (${s.hourKey})` : `${s.minutes}m @ ${s.hourKey}`))
      .join(lang === 'ar' ? ' و ' : ' + ');

    setSaveStatus(
      lang === 'ar'
        ? `✅ تم تسجيل جلسة تركيز: ${summaryStr}`
        : `✅ Logged focus session: ${summaryStr}`
    );
    setTimeout(() => setSaveStatus(''), 4000);
  };

  // Unified Android Back-Button (Capacitor) & Desktop Escape key handling
  useEffect(() => {
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

    // 1. Desktop Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close active top modal
      if (e.key === 'Escape') {
        const closed = handleCloseTopModal();
        if (closed) {
          e.preventDefault();
        }
        return;
      }

      // Alt + P (or Alt + ح in Arabic layout): Toggle Focus Pomodoro View
      if (e.altKey && (e.key === 'p' || e.key === 'P' || e.key === 'ح')) {
        e.preventDefault();
        handleToggleFocusMode();
        return;
      }

      // Alt + T (or Alt + ف in Arabic layout): Toggle Todo Inbox Drawer (when enabled in settings)
      if (showTodoInbox && e.altKey && (e.key === 't' || e.key === 'T' || e.key === 'ف')) {
        e.preventDefault();
        setTodoDrawerOpen((prev) => !prev);
        return;
      }

      // Alt + F (or Alt + ب in Arabic layout) or Ctrl + K / Cmd + K: Open Global Search
      if (
        (e.altKey && (e.key === 'f' || e.key === 'F' || e.key === 'ب')) ||
        ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K'))
      ) {
        e.preventDefault();
        setGlobalSearchOpen((prev) => !prev);
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // 2. Capacitor Android Hardware Back Button
    let backButtonHandle: { remove: () => void } | null = null;
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/app').then(({ App: CapApp }) => {
        CapApp.addListener('backButton', ({ canGoBack }) => {
          const closed = handleCloseTopModal();
          if (!closed) {
            if (canGoBack) {
              window.history.back();
            } else {
              CapApp.minimizeApp();
            }
          }
        }).then((listener) => {
          backButtonHandle = listener;
        }).catch((err) => {
          console.warn('Capacitor backButton listener init warning:', err);
        });
      }).catch(() => { });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (backButtonHandle) {
        backButtonHandle.remove();
      }
    };
  }, [ // eslint-disable-line react-hooks/exhaustive-deps -- stable setters + render-closure handlers; re-binding every shortcut listener per render is worse
    authModalOpen,
    settingsModalOpen,
    dayDistModalOpen,
    chartsModalOpen,
    aiSummaryModalOpen,
    exportModalOpen,
    sleepOnboardModalOpen,
    ageModalOpen,
    pwaModalOpen,
    guideModalOpen,
    focusModeActive,
    todoDrawerOpen,
    showTodoInbox,
    globalSearchOpen
  ]);

  // Birthday reminder banner check (1 month, 1 week, same day)
  let bdayBannerText = '';
  let ageDisplayValue = '';
  let ageUnit = '';
  if (showAgeBadge && userBirthDate && ageDisplayOpt !== 'none') {
    const birth = new Date(userBirthDate + 'T00:00:00');
    if (!isNaN(birth.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Age calculation if enabled
      if (ageDisplayOpt === 'days' || ageDisplayOpt === 'years') {
        const now = new Date();
        const diffMs = now.getTime() - birth.getTime();
        if (diffMs > 0) {
          if (ageDisplayOpt === 'days') {
            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            ageDisplayValue = days.toLocaleString('en-US');
            ageUnit = lang === 'ar' ? 'يوم' : 'd';
          } else {
            const years = (diffMs / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);
            ageDisplayValue = years;
            ageUnit = lang === 'ar' ? 'سنة' : 'y';
          }
        }
      }

      const nextBday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
      if (nextBday < today) nextBday.setFullYear(today.getFullYear() + 1);
      const diffTime = nextBday.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        bdayBannerText =
          lang === 'ar'
            ? '🥳🎉 اليوم هو عيد ميلادك! كل عام وأنت بألف خير وإنجاز وتوفيق دائم وسعادة! 🎂✨'
            : '🥳🎉 Happy Birthday Today! Wishing you a fantastic year filled with success and joy! 🎂✨';
      } else if (diffDays <= 7) {
        bdayBannerText =
          lang === 'ar'
            ? diffDays === 1
              ? '🎂 تنبيه عيد الميلاد: متبقي يوم واحد فقط على عيد ميلادك! 🎉'
              : diffDays === 2
                ? '🎂 تنبيه عيد الميلاد: متبقي يومان فقط على عيد ميلادك! 🎉'
                : `🎂 تنبيه عيد الميلاد: متبقي على عيد ميلادك ${diffDays} أيام فقط! 🎉`
            : `🎂 Birthday Countdown: Only ${diffDays} day${diffDays === 1 ? '' : 's'} left until your birthday! 🎉`;
      } else if (diffDays <= 30) {
        bdayBannerText =
          lang === 'ar'
            ? `🎈 تذكير مبكر: متبقي قرابة شهر على عيد ميلادك (${diffDays} يوماً)! ✨`
            : `🎈 Early Reminder: Around 1 month until your birthday (${diffDays} days left)! ✨`;
      }
    }
  }

  // Birthday celebration confetti on the day
  useEffect(() => {
    if (!userBirthDate) return;
    const birth = new Date(userBirthDate + 'T00:00:00');
    if (isNaN(birth.getTime())) return;
    const today = new Date();
    if (today.getMonth() === birth.getMonth() && today.getDate() === birth.getDate()) {
      const alreadyTriggeredKey = `bday_confetti_${isoDate(today)}`;
      if (!sessionStorage.getItem(alreadyTriggeredKey)) {
        sessionStorage.setItem(alreadyTriggeredKey, 'true');
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch { }
      }
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
        credential = (res as any)._tokenResponse?.oauthAccessToken || null;
      }

      if (credential) {
        setGcalAccessToken(credential);
        sessionStorage.setItem('gcal_access_token', credential);
        setCalSyncEnabled(true);
        localStorage.setItem('calSyncEnabled', 'true');
        syncPreferences(currentUser);
        setSaveStatus(lang === 'ar' ? '🎉 تم ربط Google Calendar بنجاح' : '🎉 Google Calendar connected successfully');
        setTimeout(() => setSaveStatus(''), 4000);
      } else {
        setCalSyncEnabled(true);
        localStorage.setItem('calSyncEnabled', 'true');
        syncPreferences(currentUser);
        setSaveStatus(lang === 'ar' ? '✅ تم الاتصال بحساب Google' : '✅ Connected to Google account');
        setTimeout(() => setSaveStatus(''), 4000);
      }
    } catch (err: any) {
      console.warn('Google calendar connect failed:', err);
      const msg = err?.code === 'auth/popup-blocked'
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
    localStorage.setItem('calSyncEnabled', 'false');
    syncPreferences(currentUser);
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
    syncPreferences(currentUser, newDay);
    setSaveStatus(lang === 'ar' ? '✓ تم تغيير بداية الأسبوع' : '✓ Week start day updated');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const t = STRINGS[lang];

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
        <div className="grid grid-cols-3 gap-2 mb-3.5 animate-in fade-in">
          <button
            type="button"
            onClick={() => setAiSummaryModalOpen(true)}
            className="bg-[var(--card)] hover:bg-[var(--bg)] border border-[var(--line)] hover:border-indigo-400 dark:hover:border-indigo-500 text-[var(--ink)] py-2 px-1.5 sm:px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 sm:gap-2 shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            title={t.aiModalTitle}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="whitespace-nowrap text-[11px] sm:text-xs font-bold">{lang === 'ar' ? 'ملخص ذكي' : 'AI Summary'}</span>
          </button>

          <button
            type="button"
            onClick={() => setChartsModalOpen(true)}
            className="bg-[var(--card)] hover:bg-[var(--bg)] border border-[var(--line)] hover:border-indigo-400 dark:hover:border-indigo-500 text-[var(--ink)] py-2 px-1.5 sm:px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 sm:gap-2 shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            title={t.chartsModalTitle}
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="whitespace-nowrap text-[11px] sm:text-xs font-bold">{lang === 'ar' ? 'الإحصائيات' : 'Charts'}</span>
          </button>

          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="bg-[var(--card)] hover:bg-[var(--bg)] border border-[var(--line)] hover:border-indigo-400 dark:hover:border-indigo-500 text-[var(--ink)] py-2 px-1.5 sm:px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 sm:gap-2 shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            title={t.exportModalTitle}
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="whitespace-nowrap text-[11px] sm:text-xs font-bold">{lang === 'ar' ? 'تصدير' : 'Export'}</span>
          </button>
        </div>
      )}

      {/* Main Sections Grid */}
      <div className="flex flex-col gap-3.5">
        {/* Hours Logging Card */}
        <section className="bg-[var(--card)] border border-[var(--line)] rounded-xl p-3.5 md:p-4 shadow-xs">
          {/* Hours Section Header - Responsive Layout for Mobile vs Desktop/iPad */}
          <div className="flex flex-col gap-2 pb-2.5 mb-3 border-b border-[var(--line)]">
            {/* ROW 1: Hours Title + Streak 🔥 + [Desktop: Focus Mode 🎯] + [Desktop: Birthday 🎂] + 0 of 24 Logged Count */}
            <div className="flex items-center justify-between gap-2 w-full">
              {/* Right Side: Title + Streak Badge + Desktop Focus Mode Button */}
              <div className="flex items-center gap-2 shrink-0">
                <h2 className="font-bold text-sm sm:text-base text-[var(--ink)] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0"></span>
                  <span>{t.hoursTitle}</span>
                </h2>

                {/* Streak Badge positioned right between Title and Focus/Logged */}
                {showStreakBadge && (
                  <div
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs border transition-all ${dailyStreak > 0
                        ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800/80 text-orange-600 dark:text-orange-400'
                        : 'bg-[var(--bg)] border-[var(--line)] text-[var(--ink-faint)]'
                      }`}
                    title={dailyStreak > 0 ? t.streakTooltip(dailyStreak) : (lang === 'ar' ? 'سجّل ساعاتك يومياً للحفاظ على شعلة الاستمرارية 🔥' : 'Log hours daily to build your streak 🔥')}
                  >
                    <Flame className={`w-3.5 h-3.5 ${dailyStreak > 0 ? 'text-orange-500 fill-orange-500 animate-pulse' : 'text-slate-400'}`} />
                    <span className="font-mono">{dailyStreak}</span>
                    <span className="text-[10px] font-normal">{lang === 'ar' ? 'يوم' : 'd'}</span>
                  </div>
                )}

                {/* Unified Focus / Pomodoro Timer Button on Desktop/iPad */}
                {isToday && showFocusModeButton && (
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      handleToggleFocusMode();
                    }}
                    title={
                      lang === 'ar'
                        ? pomoBgState.isRunning
                          ? `مؤقت التركيز يعمل في الخلفية (${pomoBgState.timeFormatted}) — انقر للفتح`
                          : focusModeActive
                            ? 'إيقاف وضع التركيز'
                            : 'فتح مؤقت التركيز (بومودورو)'
                        : pomoBgState.isRunning
                          ? `Focus Timer running (${pomoBgState.timeFormatted}) — Click to open`
                          : focusModeActive
                            ? 'Exit Focus Mode'
                            : 'Open Focus Timer (Pomodoro)'
                    }
                    className={`hidden md:inline-flex px-3 py-1 rounded-xl border text-xs font-bold transition-all shadow-xs cursor-pointer items-center gap-1.5 whitespace-nowrap shrink-0 ${focusModeActive || pomoBgState.isRunning
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-indigo-500/20 shadow-md ring-2 ring-indigo-400/40'
                        : 'bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/70 border-indigo-200 dark:border-indigo-800/70 text-indigo-700 dark:text-indigo-300'
                      }`}
                  >
                    <Target
                      className={`w-3.5 h-3.5 ${focusModeActive || pomoBgState.isRunning ? 'text-white animate-pulse' : 'text-indigo-600 dark:text-indigo-400'
                        }`}
                    />
                    <span>{t.focusModeBtnText}</span>
                    {pomoBgState.isRunning && (
                      <span className="inline-flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded-md font-mono text-[11px] font-black tracking-tight text-white">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                        <span>{pomoBgState.timeFormatted}</span>
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Left Side: Desktop Birthday / Age Display (on md+) + 0 of 24 Logged Count Badge */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {ageDisplayValue && (
                  <button
                    type="button"
                    onClick={() => setSettingsModalOpen(true)}
                    className="hidden md:inline-flex bg-rose-50/90 hover:bg-rose-100/90 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200/90 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 px-2.5 py-0.5 rounded-lg text-xs font-semibold items-center gap-1.5 shadow-2xs cursor-pointer hover:border-rose-400 dark:hover:border-rose-600 select-none shrink-0 transition-all"
                    title={lang === 'ar' ? `العمر: ${ageDisplayValue} ${ageUnit} (انقر للإعدادات)` : `Age: ${ageDisplayValue} ${ageUnit} (Click for settings)`}
                  >
                    <Cake className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="font-bold font-mono text-[var(--ink)]">{ageDisplayValue}</span>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">{ageUnit}</span>
                  </button>
                )}

                <span className="text-[11px] sm:text-xs font-semibold text-[var(--ink-soft)] bg-[var(--bg)] border border-[var(--line)] px-2.5 py-0.5 rounded-lg shrink-0">
                  {lang === 'ar' ? `${activeLoggedCount} من ${activeHoursKeys.length} مسجلة` : `${activeLoggedCount}/${activeHoursKeys.length} logged`}
                </span>
              </div>
            </div>

            {/* ROW 2: Mobile-Only Row (Hidden on Desktop/iPad where controls are integrated into Row 1) */}
            {((isToday && showFocusModeButton) || ageDisplayValue) && (
              <div className="flex md:hidden items-center justify-between gap-2 pt-1 border-t border-dashed border-[var(--line)]">
                {/* Unified Focus Mode Button on mobile */}
                {isToday && showFocusModeButton && (
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      handleToggleFocusMode();
                    }}
                    title={
                      lang === 'ar'
                        ? pomoBgState.isRunning
                          ? `مؤقت التركيز يعمل في الخلفية (${pomoBgState.timeFormatted}) — انقر للفتح`
                          : focusModeActive
                            ? 'إيقاف وضع التركيز'
                            : 'فتح مؤقت التركيز (بومودورو)'
                        : pomoBgState.isRunning
                          ? `Focus Timer running (${pomoBgState.timeFormatted}) — Click to open`
                          : focusModeActive
                            ? 'Exit Focus Mode'
                            : 'Open Focus Timer (Pomodoro)'
                    }
                    className={`flex-1 justify-center px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${focusModeActive || pomoBgState.isRunning
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-indigo-500/20 shadow-md ring-2 ring-indigo-400/40'
                        : 'bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/70 border-indigo-200 dark:border-indigo-800/70 text-indigo-700 dark:text-indigo-300'
                      }`}
                  >
                    <Target
                      className={`w-3.5 h-3.5 ${focusModeActive || pomoBgState.isRunning ? 'text-white animate-pulse' : 'text-indigo-600 dark:text-indigo-400'
                        }`}
                    />
                    <span>{t.focusModeBtnText}</span>
                    {pomoBgState.isRunning && (
                      <span className="inline-flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded-md font-mono text-[11px] font-black tracking-tight text-white">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                        <span>{pomoBgState.timeFormatted}</span>
                      </span>
                    )}
                  </button>
                )}

                {/* Birthday / Age Display after Focus Mode on mobile */}
                {ageDisplayValue && (
                  <button
                    type="button"
                    onClick={() => setSettingsModalOpen(true)}
                    className="bg-rose-50/90 hover:bg-rose-100/90 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200/90 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer hover:border-rose-400 dark:hover:border-rose-600 select-none shrink-0 transition-all"
                    title={lang === 'ar' ? `العمر: ${ageDisplayValue} ${ageUnit} (انقر للإعدادات)` : `Age: ${ageDisplayValue} ${ageUnit} (Click for settings)`}
                  >
                    <Cake className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="font-bold font-mono text-[var(--ink)]">{ageDisplayValue}</span>
                    <span className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">{ageUnit}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Focus Mode Banner (when active and today) */}
          {focusModeActive && isToday && (
            <div className="mb-3 bg-indigo-50/95 dark:bg-indigo-950/70 border border-indigo-200/90 dark:border-indigo-800/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2 shadow-xs animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-950 dark:text-indigo-200 min-w-0">
                <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 animate-pulse" />
                <span className="truncate">{t.focusModeActiveBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleFocusMode(false)}
                className="bg-white dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-300 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer shadow-2xs"
              >
                {t.focusModeExitBtn}
              </button>
            </div>
          )}

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

      {/* Footer */}
      <footer className="text-center text-xs text-[var(--ink-soft)] mt-8 mb-4 flex flex-col items-center justify-center gap-1.5 no-print select-none">
        <p className="text-[11px] text-[var(--ink-faint)]">{t.footer}</p>
        <div className="text-[11px] font-medium text-[var(--ink-soft)]">
          <span>{lang === 'ar' ? 'جميع الحقوق محفوظة © zerocold 2026' : 'All rights reserved © zerocold 2026'}</span>
        </div>
        <div className="flex items-center justify-center pt-0.5">
          <span className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 font-mono px-2.5 py-0.5 rounded-md text-[10px] font-semibold shadow-2xs">
            {lang === 'ar' ? `الإصدار ${APP_VERSION}` : `Version ${APP_VERSION}`}
          </span>
        </div>
      </footer>

      {/* All Modals */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        sleepSettings={sleepSettings}
        onChangeSleepSettings={(s) => {
          setSleepSettings(s);
          syncPreferences(currentUser);
        }}
        userBirthDate={userBirthDate}
        ageDisplayOpt={ageDisplayOpt}
        showAgeBadge={showAgeBadge}
        onToggleAgeBadge={(en) => {
          setShowAgeBadge(en);
          localStorage.setItem('showAgeBadge', en ? 'true' : 'false');
          syncPreferences(currentUser);
        }}
        onSaveAge={(bDate, opt) => {
          setUserBirthDate(bDate);
          setAgeDisplayOpt(opt);
          if (!bDate) {
            localStorage.removeItem('userBirthDate');
          } else {
            localStorage.setItem('userBirthDate', bDate);
          }
          localStorage.setItem('ageDisplayOpt', opt);
          syncPreferences(currentUser);
        }}
        weekStartDay={weekStartDay}
        onChangeWeekStartDay={handleChangeWeekStartDay}
        isDetailedView={isDetailedView}
        onToggleDetailedView={handleToggleDetailedView}
        devToolsEnabled={devToolsEnabled}
        onToggleDevTools={(en) => {
          setDevToolsEnabled(en);
          syncPreferences(currentUser);
        }}
        showStreakBadge={showStreakBadge}
        onToggleStreakBadge={(en) => {
          setShowStreakBadge(en);
          localStorage.setItem('showStreakBadge', en ? 'true' : 'false');
          syncPreferences(currentUser);
        }}
        showFocusModeButton={showFocusModeButton}
        onToggleShowFocusModeButton={(en) => {
          setShowFocusModeButton(en);
          localStorage.setItem('showFocusModeButton', en ? 'true' : 'false');
          if (!en) setFocusModeActive(false);
          syncPreferences(currentUser);
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
          localStorage.setItem('morningNudgeEnabled', en ? 'true' : 'false');
          syncPreferences(currentUser);
        }}
        eveningWrapUpEnabled={eveningWrapUpEnabled}
        onToggleEveningWrapUp={(en) => {
          setEveningWrapUpEnabled(en);
          localStorage.setItem('eveningWrapUpEnabled', en ? 'true' : 'false');
          syncPreferences(currentUser);
        }}
        tagTargets={tagTargets}
        onChangeTagTargets={(targets) => {
          setTagTargets(targets);
          localStorage.setItem('tagTargets', JSON.stringify(targets));
          syncPreferences(currentUser);
        }}
        isCalSyncConnected={!!gcalAccessToken}
        currentUserEmail={currentUser?.email}
        onConnectGCal={handleConnectGCal}
        onDisconnectGCal={handleDisconnectGCal}
        calSyncEnabled={calSyncEnabled}
        onToggleCalSync={(en) => {
          setCalSyncEnabled(en);
          syncPreferences(currentUser);
        }}
        autoCloudSync={autoCloudSync}
        onToggleAutoCloudSync={(en) => {
          setAutoCloudSync(en);
          localStorage.setItem('autoCloudSync', en ? 'true' : 'false');
          syncPreferences(currentUser);
        }}
        onSyncAllToCloudNow={handleSyncAllWeeksNow}
        isSyncingAllWeeks={isSyncingAllWeeks}
        isUserLoggedIn={!!currentUser}
        onOpenPwaModal={() => setPwaModalOpen(true)}
        onOpenGuide={() => setGuideModalOpen(true)}
        darkMode={isDarkEffective}
        onToggleDarkMode={handleCycleThemeMode}
        themeMode={themeMode}
        isDarkEffective={isDarkEffective}
        onChangeThemeMode={handleChangeThemeMode}
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
            onInboxRestored: (items) => {
              setTodoInbox(items);
              if (db && currentUser) {
                const docRef = doc(db, 'artifacts', 'time-log-app', 'users', currentUser.uid, 'inbox', 'todos');
                setDoc(docRef, { items, updatedAt: new Date().toISOString() }).catch(() => { });
              }
            },
            onPrefsRestored: (prefs) => {
              // Apply all restored preferences to React state
              if (prefs.tagTargets) setTagTargets(prefs.tagTargets);
              if (prefs.sleepSettings) setSleepSettings(prefs.sleepSettings);
              if (prefs.weekStartDay) setWeekStartDay(prefs.weekStartDay);
              if (prefs.themeMode) setThemeMode(prefs.themeMode);
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
          syncPreferences(currentUser);
        }}
        onSkip={() => {
          setSleepSettings((prev) => ({ ...prev, enabled: false, onboarded: true }));
          syncPreferences(currentUser);
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
          syncPreferences(currentUser);
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
