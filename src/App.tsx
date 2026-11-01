import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db, doc, setDoc, getDoc, onSnapshot, signOut, signInWithPopup, googleProvider, GoogleAuthProvider, Capacitor } from './services/firebase';
import {
  TagCode,
  GoalItem,
  TodoItem,
  DayData,
  WeekData,
  SleepSettings,
  AgeDisplayOpt,
  WeekStartDay,
  ThemeMode
} from './types';
import {
  HOURS_LIST,
  HOUR_TO_24,
  STRINGS,
  TAGS_CONFIG
} from './constants/config';
import { startOfWeekFor, mondayOf, isoDate, addDays, emptyDay, getCurrentHourKey, normalizeWeekData, focusCurrentHourInput } from './utils/dateUtils';
import { calculateDailyStreak } from './utils/streakUtils';
import { soundManager } from './utils/soundEffects';
import confetti from 'canvas-confetti';
import { fetchCalendarEventsForDate } from './services/calendarService';

// Components
import { Header } from './components/Header';
import { WeekNavigator } from './components/WeekNavigator';
import { TagRingsOverview } from './components/TagRingsOverview';
import { HoursList } from './components/HoursList';
import { PrioritiesSection } from './components/PrioritiesSection';
import { TagLegend } from './components/TagLegend';
import { SaveToast } from './components/SaveToast';

// Modals
import { AuthModal } from './components/Modals/AuthModal';
import { DayDistModal } from './components/Modals/DayDistModal';
import { ChartsModal } from './components/Modals/ChartsModal';
import { AiSummaryModal } from './components/Modals/AiSummaryModal';
import { ExportModal } from './components/Modals/ExportModal';
import { SleepOnboardModal } from './components/Modals/SleepOnboardModal';
import { AgeSettingsModal } from './components/Modals/AgeSettingsModal';
import { PwaModal } from './components/Modals/PwaModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { GuideModal } from './components/Modals/GuideModal';
import { FocusPomodoroView } from './components/FocusPomodoroView';
import { TodoInboxDrawer } from './components/Modals/TodoInboxDrawer';

import { Sparkles, BarChart3, Download, Flame, Cake, Target } from 'lucide-react';

export default function App() {
  // 0. Week Start Day Preference (saturday / sunday / monday)
  const [weekStartDay, setWeekStartDay] = useState<WeekStartDay>(() => {
    return (localStorage.getItem('weekStartDay') as WeekStartDay) || 'saturday';
  });

  // 0.1 Brain Dump & Todo Inbox State
  const [todoInbox, setTodoInbox] = useState<TodoItem[]>(() => {
    try {
      const local = localStorage.getItem('time_log_todo_inbox');
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  });
  const [todoDrawerOpen, setTodoDrawerOpen] = useState(false);

    // 1. Core Date & Data State
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const initialDay = (localStorage.getItem('weekStartDay') as WeekStartDay) || 'saturday';
    return startOfWeekFor(new Date(), initialDay);
  });
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);

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

  // 3-State Theme Mode ('system' | 'light' | 'dark'), default is 'light' (نهاري)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('themeMode');
    if (saved === 'system' || saved === 'light' || saved === 'dark') return saved as ThemeMode;
    // Check legacy darkMode boolean if exists
    const legacy = localStorage.getItem('darkMode');
    if (legacy === 'true') return 'dark';
    if (legacy === 'false') return 'light';
    return 'light';
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Track system theme changes dynamically in real-time
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const isDarkEffective = themeMode === 'system' ? systemIsDark : themeMode === 'dark';

  const handleCycleThemeMode = useCallback(() => {
    setThemeMode((prev) => {
      let next: ThemeMode;
      if (prev === 'light') next = 'dark';
      else if (prev === 'dark') next = 'system';
      else next = 'light';
      localStorage.setItem('themeMode', next);
      localStorage.setItem('darkMode', String(next === 'dark' || (next === 'system' && systemIsDark)));
      if (db && currentUser) {
        const docRef = doc(db, 'users', currentUser.uid, 'settings', 'preferences');
        setDoc(docRef, { themeMode: next, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
      }
      return next;
    });
  }, [systemIsDark, currentUser]);

  const handleChangeThemeMode = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem('themeMode', mode);
    localStorage.setItem('darkMode', String(mode === 'dark' || (mode === 'system' && systemIsDark)));
    if (db && currentUser) {
      const docRef = doc(db, 'users', currentUser.uid, 'settings', 'preferences');
      setDoc(docRef, { themeMode: mode, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    }
  }, [systemIsDark, currentUser]);

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
        setDoc(docRef, { isDetailedView: next, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
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
    return localStorage.getItem('showFocusModeButton') !== 'false';
  });
  const [focusModeActive, setFocusModeActive] = useState<boolean>(false);
  const [calSyncEnabled, setCalSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('calSyncEnabled') !== 'false';
  });
  const [userBirthDate, setUserBirthDate] = useState<string>(() => {
    return localStorage.getItem('userBirthDate') || '';
  });
  const [ageDisplayOpt, setAgeDisplayOpt] = useState<AgeDisplayOpt>(() => {
    const saved = localStorage.getItem('ageDisplayOpt');
    if (saved === 'days' || saved === 'years') return saved;
    return 'none';
  });

  // 3. Sleep Window State
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

  // 4. Google Calendar & Suggestions
  const [gcalAccessToken, setGcalAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('gcal_access_token') || sessionStorage.getItem('gcal_access_token') || null;
  });
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState<Record<string, { text: string; tag: TagCode }>>({});
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissedSuggestions') || '{}');
    } catch {
      return {};
    }
  });

  // 5. Modals State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [dayDistModalOpen, setDayDistModalOpen] = useState(false);
  const [chartsModalOpen, setChartsModalOpen] = useState(false);
  const [aiSummaryModalOpen, setAiSummaryModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [sleepOnboardModalOpen, setSleepOnboardModalOpen] = useState(false);
  const [ageModalOpen, setAgeModalOpen] = useState(false);
  const [pwaModalOpen, setPwaModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [pomoBgState, setPomoBgState] = useState<{
    isRunning: boolean;
    timeFormatted: string;
    mode: 'focus' | 'shortBreak' | 'longBreak';
  }>({
    isRunning: false,
    timeFormatted: '25:00',
    mode: 'focus'
  });

  // Set HTML dir & lang
  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  }, [lang]);

  // Set Dark mode class dynamically based on effective theme
  useEffect(() => {
    if (isDarkEffective) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkEffective]);

  // Sleep hours keys calculation
  const getSleepHourKeys = useCallback(() => {
    if (!sleepSettings.enabled) return [];
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
  } catch {}
  const { streak: dailyStreak, hasToday: streakHasToday } = calculateDailyStreak(allDaysHours, allDaysGolden);

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

    // Check local storage cache
    const cached = localStorage.getItem(localKey) || localStorage.getItem(`time_log_week_${user ? user.uid : 'guest'}_${wsKey}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const normalized = normalizeWeekData(parsed, ws);
        setWeekData(normalized);
        setIsDataLoaded(true);
        return;
      } catch {}
    }

    // Default empty week with normalized structures
    const empty = normalizeWeekData({}, ws);
    setWeekData(empty);
    setIsDataLoaded(true);
  }, []);

  // Save Week Data (debounced)
  const saveWeekData = useCallback(
    async (updated: WeekData, ws: Date, user: User | null) => {
      setSaveStatus(STRINGS[lang].saving);
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

      setSaveStatus(STRINGS[lang].saved);
      setTimeout(() => setSaveStatus(''), 2000);
    },
    [lang]
  );

  // Sync Preferences to Firestore & Local
  const syncPreferences = useCallback(
    async (user: User | null, customWeekStartDay?: WeekStartDay) => {
      const activeWeekStartDay = customWeekStartDay || weekStartDay;
      localStorage.setItem('sleepSettings', JSON.stringify(sleepSettings));
      localStorage.setItem('userBirthDate', userBirthDate);
      localStorage.setItem('ageDisplayOpt', ageDisplayOpt);
      localStorage.setItem('weekStartDay', activeWeekStartDay);
      localStorage.setItem('devToolsEnabled', String(devToolsEnabled));
      localStorage.setItem('showAgeBadge', String(showAgeBadge));
      localStorage.setItem('showStreakBadge', String(showStreakBadge));
      localStorage.setItem('showFocusModeButton', String(showFocusModeButton));
      localStorage.setItem('calSyncEnabled', String(calSyncEnabled));
      localStorage.setItem('themeMode', themeMode);
      localStorage.setItem('isDetailedView', String(isDetailedView));

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
              calSyncEnabled,
              themeMode,
              isDetailedView,
              updatedAt: new Date().toISOString()
            },
            { merge: true }
          );
        } catch (err) {
          console.warn('Failed to sync preferences to Firestore:', err);
        }
      }
    },
    [sleepSettings, userBirthDate, ageDisplayOpt, showAgeBadge, weekStartDay, devToolsEnabled, showStreakBadge, showFocusModeButton, calSyncEnabled, themeMode, isDetailedView]
  );

  // Auth State Listener
  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      setCurrentUser(u);
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
            if (data.weekStartDay) {
              setWeekStartDay(data.weekStartDay);
              localStorage.setItem('weekStartDay', data.weekStartDay);
              const newWs = startOfWeekFor(currentDate, data.weekStartDay);
              setWeekStart(newWs);
              loadWeekData(newWs, u);
              return;
            }
            if (data.devToolsEnabled !== undefined) setDevToolsEnabled(data.devToolsEnabled);
            if (data.showAgeBadge !== undefined) setShowAgeBadge(data.showAgeBadge);
            if (data.showStreakBadge !== undefined) setShowStreakBadge(data.showStreakBadge);
            if (data.showFocusModeButton !== undefined) setShowFocusModeButton(data.showFocusModeButton);
            if (data.calSyncEnabled !== undefined) setCalSyncEnabled(data.calSyncEnabled);
          }
        } catch {}
      } else {
        setCurrentUser(null);
      }
      loadWeekData(weekStart, u);
    });
    return () => unsub();
  }, [loadWeekData, weekStart, currentDate]);

  // Sleep settings are managed cleanly through the Settings Modal, so disable automatic popup spam
  useEffect(() => {
    // Only if explicitly triggered, never auto-popup
    if (!sleepSettings.onboarded) {
      setSleepSettings((prev) => ({ ...prev, onboarded: true }));
      localStorage.setItem('sleepSettings', JSON.stringify({ ...sleepSettings, onboarded: true }));
    }
  }, [sleepSettings]);

  // Initial load auto-focus: if no golden goal -> focus golden goal; if golden goal exists -> focus current hour
  const initialStartupFocusDoneRef = useRef(false);
  useEffect(() => {
    if (!isDataLoaded || initialStartupFocusDoneRef.current) return;

    const todayStr = isoDate(new Date());
    const day = weekData.days[todayStr];
    if (day) {
      initialStartupFocusDoneRef.current = true;
      const hasGolden = !!(day.goldenGoal && day.goldenGoal.text && day.goldenGoal.text.trim() !== '');

      setTimeout(() => {
        if (!hasGolden) {
          const el = document.getElementById('golden-goal-input');
          if (el) {
            el.focus();
          }
        } else {
          focusCurrentHourInput();
        }
      }, 250);
    }
  }, [isDataLoaded, weekData.days]);

  // Handlers for Hours List
  const handleChangeHour = (key: string, text: string, tag: TagCode) => {
    const updatedDays = { ...weekData.days };
    const currentDay = updatedDays[dateStr] || emptyDay();
    currentDay.hours = {
      ...currentDay.hours,
      [key]: { text, tag }
    };
    updatedDays[dateStr] = currentDay;
    const newWeek = { ...weekData, days: updatedDays };
    setWeekData(newWeek);
    saveWeekData(newWeek, weekStart, currentUser);
  };

  const handleCopyDown = (sourceKey: string, targetKey: string) => {
    const sourceEntry = currentDayData.hours[sourceKey] || { text: '', tag: '' };
    if (!sourceEntry.text.trim() && !sourceEntry.tag) return;
    handleChangeHour(targetKey, sourceEntry.text, sourceEntry.tag);
  };

  const handleToggleSleepException = () => {
    const updated = {
      ...sleepExceptionDays,
      [dateStr]: !sleepExceptionDays[dateStr]
    };
    setSleepExceptionDays(updated);
    localStorage.setItem('sleepExceptionDays', JSON.stringify(updated));
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
    handleChangeGoldenGoal({ text: todo.text, done: false, tag: (todo.tag || '') as TagCode });
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
    handleChangePriorities(quadKey, updatedList);

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
  const handleChangeGoldenGoal = (item: GoalItem) => {
    const updatedDays = { ...weekData.days };
    const currentDay = updatedDays[dateStr] || emptyDay();
    const wasDone = currentDay.goldenGoal.done;
    currentDay.goldenGoal = item;
    updatedDays[dateStr] = currentDay;
    const newWeek = { ...weekData, days: updatedDays };
    setWeekData(newWeek);
    saveWeekData(newWeek, weekStart, currentUser);

    // Confetti celebration on completion!
    if (!wasDone && item.done && item.text.trim() !== '') {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  };

  const handleChangePriorities = (quadKey: 'q1' | 'q2' | 'q3' | 'q4', items: GoalItem[]) => {
    const updatedDays = { ...weekData.days };
    const currentDay = updatedDays[dateStr] || emptyDay();
    currentDay.priorities = {
      ...currentDay.priorities,
      [quadKey]: items
    };
    updatedDays[dateStr] = currentDay;
    const newWeek = { ...weekData, days: updatedDays };
    setWeekData(newWeek);
    saveWeekData(newWeek, weekStart, currentUser);
  };

  const handlePromoteToGolden = (item: GoalItem, quadKey: 'q1' | 'q2' | 'q3' | 'q4', itemIdx: number) => {
    if (currentDayData.goldenGoal.text && currentDayData.goldenGoal.text.trim() !== '') {
      setSaveStatus(STRINGS[lang].goldenNotEmpty);
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }
    handleChangeGoldenGoal({ text: item.text, done: item.done || false, tag: item.tag || '' });
    const currentQuadList = currentDayData.priorities[quadKey] || [];
    const filtered = currentQuadList.filter((_, idx) => idx !== itemIdx);
    handleChangePriorities(quadKey, filtered.length === 0 ? [{ text: '', done: false, tag: '' }] : filtered);
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
    saveWeekData(newWeek, weekStart, currentUser);

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
        } catch {}
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
      } catch {}
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

  const handleLogPomodoroToCurrentHour = (text: string, minutes: number, tag: TagCode) => {
    const currentKey = getCurrentHourKey();
    const existing = currentDayData.hours[currentKey] || { text: '', tag: '' };
    const prefix = `[🎯 ${minutes}m] `;
    const updatedText = existing.text.trim()
      ? `${existing.text} • ${prefix}${text}`
      : `${prefix}${text}`;
    handleChangeHour(currentKey, updatedText, tag || (existing.tag as TagCode) || 'E');
    setSaveStatus(
      lang === 'ar'
        ? `✅ تم تسجيل ${minutes} دقيقة تركيز بنجاح في ${currentKey}`
        : `✅ Logged ${minutes}m focus session to ${currentKey}`
    );
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Unified Android Back-Button (Capacitor) & Desktop Escape key handling
  useEffect(() => {
    const handleCloseTopModal = (): boolean => {
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

    // 1. Desktop Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const closed = handleCloseTopModal();
        if (closed) {
          e.preventDefault();
        }
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
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (backButtonHandle) {
        backButtonHandle.remove();
      }
    };
  }, [
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
    focusModeActive
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

      let nextBday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
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
        } catch {}
      }
    }
  }, [userBirthDate]);

  // Google Calendar Events Fetcher for the active day
  useEffect(() => {
    if (!calSyncEnabled || !gcalAccessToken) {
      setGoogleCalendarEvents({});
      return;
    }

    let isMounted = true;
    fetchCalendarEventsForDate(currentDate, gcalAccessToken).then((events) => {
      if (!isMounted) return;
      // Filter out dismissed suggestions for this date
      const activeEvents: Record<string, { text: string; tag: TagCode }> = {};
      Object.entries(events).forEach(([k, val]) => {
        if (!dismissedSuggestions[`${dateStr}_${k}`]) {
          activeEvents[k] = val;
        }
      });
      setGoogleCalendarEvents(activeEvents);
    });

    return () => {
      isMounted = false;
    };
  }, [calSyncEnabled, gcalAccessToken, currentDate, dateStr, dismissedSuggestions]);

  // Google Calendar Connection
  const handleConnectGCal = async () => {
    if (!auth || !googleProvider) return;
    try {
      const res = await signInWithPopup(auth, googleProvider);
      let credential: string | null = null;
      try {
        const googleCred = GoogleAuthProvider.credentialFromResult(res);
        credential = googleCred?.accessToken || null;
      } catch {}
      if (!credential) {
        credential = (res as any)._tokenResponse?.oauthAccessToken || null;
      }

      if (credential) {
        setGcalAccessToken(credential);
        localStorage.setItem('gcal_access_token', credential);
        sessionStorage.setItem('gcal_access_token', credential);
        setCalSyncEnabled(true);
        localStorage.setItem('calSyncEnabled', 'true');
        setSaveStatus(lang === 'ar' ? '🎉 تم ربط Google Calendar بنجاح' : '🎉 Google Calendar connected successfully');
        setTimeout(() => setSaveStatus(''), 4000);
      } else {
        setCalSyncEnabled(true);
        localStorage.setItem('calSyncEnabled', 'true');
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
    localStorage.removeItem('gcal_access_token');
    sessionStorage.removeItem('gcal_access_token');
    setSaveStatus(lang === 'ar' ? 'تم فصل حساب تقويم Google' : 'Google Calendar disconnected');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Date Navigation
  const handleSelectDate = (d: Date) => {
    setCurrentDate(d);
    const newWs = startOfWeekFor(d, weekStartDay);
    if (isoDate(newWs) !== isoDate(weekStart)) {
      setWeekStart(newWs);
      loadWeekData(newWs, currentUser);
    }
  };

  const handleOffsetWeek = (offset: number) => {
    const newWs = addDays(weekStart, offset * 7);
    const newCd = addDays(currentDate, offset * 7);
    setWeekStart(newWs);
    setCurrentDate(newCd);
    loadWeekData(newWs, currentUser);
  };

  const handleResetToday = () => {
    const today = new Date();
    setCurrentDate(today);
    const newWs = startOfWeekFor(today, weekStartDay);
    setWeekStart(newWs);
    loadWeekData(newWs, currentUser);
    focusCurrentHourInput();
  };

  const handleChangeWeekStartDay = (newDay: WeekStartDay) => {
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
        onOpenTodoInbox={() => setTodoDrawerOpen(true)}
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
                    className={`px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs border transition-all ${
                      dailyStreak > 0
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
                    className={`hidden md:inline-flex px-3 py-1 rounded-xl border text-xs font-bold transition-all shadow-xs cursor-pointer items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      focusModeActive || pomoBgState.isRunning
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-indigo-500/20 shadow-md ring-2 ring-indigo-400/40'
                        : 'bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/70 border-indigo-200 dark:border-indigo-800/70 text-indigo-700 dark:text-indigo-300'
                    }`}
                  >
                    <Target
                      className={`w-3.5 h-3.5 ${
                        focusModeActive || pomoBgState.isRunning ? 'text-white animate-pulse' : 'text-indigo-600 dark:text-indigo-400'
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
                    className={`flex-1 justify-center px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      focusModeActive || pomoBgState.isRunning
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-indigo-500/20 shadow-md ring-2 ring-indigo-400/40'
                        : 'bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/70 border-indigo-200 dark:border-indigo-800/70 text-indigo-700 dark:text-indigo-300'
                    }`}
                  >
                    <Target
                      className={`w-3.5 h-3.5 ${
                        focusModeActive || pomoBgState.isRunning ? 'text-white animate-pulse' : 'text-indigo-600 dark:text-indigo-400'
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

        {/* Priority Matrix & Golden Goal */}
        <PrioritiesSection
          goldenGoal={currentDayData.goldenGoal}
          onChangeGoldenGoal={handleChangeGoldenGoal}
          priorities={currentDayData.priorities}
          onChangePriorities={handleChangePriorities}
          onPromoteToGolden={handlePromoteToGolden}
          onRollover={handleRollover}
          onOpenTodoInbox={() => setTodoDrawerOpen(true)}
          todoCount={todoInbox.filter((t) => !t.done).length}
          lang={lang}
        />

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
            {lang === 'ar' ? 'الإصدار v3.8' : 'Version v3.8'}
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
        isCalSyncConnected={!!gcalAccessToken}
        currentUserEmail={currentUser?.email}
        onConnectGCal={handleConnectGCal}
        onDisconnectGCal={handleDisconnectGCal}
        calSyncEnabled={calSyncEnabled}
        onToggleCalSync={(en) => {
          setCalSyncEnabled(en);
          syncPreferences(currentUser);
        }}
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
        onImportBackup={(imported) => {
          setWeekData(imported);
          saveWeekData(imported, weekStart, currentUser);
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

      {/* Floating Save Toast Notification */}
      <SaveToast status={saveStatus} />
    </div>
  );
}
