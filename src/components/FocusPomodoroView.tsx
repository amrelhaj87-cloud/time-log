import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  CheckCircle2,
  Square,
  Tag as TagIcon,
  Sun,
  Moon,
  Laptop,
  Bell,
  BellOff
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { STRINGS, TAGS_CONFIG, TAG_SHORT_LABELS } from '../constants/config';
import { TagCode, ThemeMode } from '../types';
import { soundManager } from '../utils/soundEffects';
import {
  isNotifyEnabled,
  setNotifyEnabled,
  ensureNotificationPermission,
  showTimerNotification
} from '../utils/timerAlerts';
import {
  ambientAudio,
  AMBIENT_SOUND_OPTIONS,
  AmbientSoundType
} from '../utils/ambientAudio';

export type PomodoroMode = 'focus' | 'shortBreak' | 'longBreak';

interface FocusPomodoroViewProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestOpen?: () => void;
  onTimerStateChange?: (state: { isRunning: boolean; timeFormatted: string; mode: PomodoroMode }) => void;
  onLogToCurrentHour?: (text: string, minutes: number, tag: TagCode) => void;
  goldenGoalText?: string;
  themeMode?: ThemeMode;
  isDarkEffective?: boolean;
  onCycleThemeMode?: () => void;
  lang: 'ar' | 'en';
}

const PRESET_DURATIONS: Record<PomodoroMode, number[]> = {
  focus: [25, 45, 60],
  shortBreak: [5, 10],
  longBreak: [15, 20, 30]
};

const POMO_TAG_KEYS: TagCode[] = ['E', 'V', 'R', 'S', 'SC'];

export const FocusPomodoroView: React.FC<FocusPomodoroViewProps> = ({
  isOpen,
  onClose,
  onRequestOpen,
  onTimerStateChange,
  onLogToCurrentHour,
  goldenGoalText,
  themeMode = 'light',
  isDarkEffective = false,
  onCycleThemeMode,
  lang
}) => {
  const t = STRINGS[lang];

  // Pomodoro State
  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [focusDurationMin, setFocusDurationMin] = useState<number>(25);
  const [shortBreakDurationMin] = useState<number>(5);
  const [longBreakDurationMin] = useState<number>(15);

  const getDurationForMode = (m: PomodoroMode, customFocus = focusDurationMin) => {
    if (m === 'focus') return customFocus * 60;
    if (m === 'shortBreak') return shortBreakDurationMin * 60;
    return longBreakDurationMin * 60;
  };

  const [totalSeconds, setTotalSeconds] = useState<number>(() => getDurationForMode('focus'));
  const [timeLeft, setTimeLeft] = useState<number>(() => getDurationForMode('focus'));
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [sessionCount, setSessionCount] = useState<number>(1);
  const [taskText, setTaskText] = useState<string>(() => goldenGoalText || '');
  const [selectedTag, setSelectedTag] = useState<TagCode>('E');

  // Ambient Audio State
  const [ambientSound, setAmbientSound] = useState<AmbientSoundType>(() => ambientAudio.getCurrentType());
  const [volume, setVolume] = useState<number>(() => Math.round(ambientAudio.getVolume() * 100));
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showAmbientMenu, setShowAmbientMenu] = useState<boolean>(false);

  // Fullscreen & Custom Duration State
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showCompletedPrompt, setShowCompletedPrompt] = useState<boolean>(false);
  const [lastCompletedMins, setLastCompletedMins] = useState<number>(25);
  const [isEditingCustomMin, setIsEditingCustomMin] = useState<boolean>(false);
  const [customMinInput, setCustomMinInput] = useState<string>('30');
  const [notifyEnabled, setNotifyEnabledState] = useState<boolean>(() => isNotifyEnabled());
  const [isAlertFlashing, setIsAlertFlashing] = useState<boolean>(false);

  const handleToggleNotify = () => {
    const next = !notifyEnabled;
    setNotifyEnabledState(next);
    setNotifyEnabled(next);
    if (next) ensureNotificationPermission();
  };

  const timerRef = useRef<number | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync ambient audio changes
  const handleSelectSound = (soundType: AmbientSoundType) => {
    setAmbientSound(soundType);
    if (soundType === 'none') {
      ambientAudio.stop();
    } else {
      ambientAudio.playSound(soundType);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    ambientAudio.setVolume(newVol / 100);
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      ambientAudio.setVolume(volume / 100);
      if (ambientSound !== 'none') {
        ambientAudio.playSound(ambientSound);
      }
    } else {
      setIsMuted(true);
      ambientAudio.setVolume(0);
    }
  };

  // Switch Mode handler
  const handleSwitchMode = (newMode: PomodoroMode, customMins?: number) => {
    setMode(newMode);
    setIsRunning(false);
    setIsEditingCustomMin(false);
    ambientAudio.stop();
    endTimeRef.current = null;
    setShowCompletedPrompt(false);
    const targetMins = customMins || (newMode === 'focus' ? focusDurationMin : newMode === 'shortBreak' ? shortBreakDurationMin : longBreakDurationMin);
    const secs = targetMins * 60;
    setTotalSeconds(secs);
    setTimeLeft(secs);
  };

  // Apply custom focus duration in minutes
  const handleApplyCustomMinutes = () => {
    const parsed = parseInt(customMinInput.trim(), 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 240) {
      setFocusDurationMin(parsed);
      handleSwitchMode('focus', parsed);
    } else {
      setIsEditingCustomMin(false);
    }
  };

  // Toggle Play / Pause with Ambient Audio syncing & automatic sound controls popup
  const handleTogglePlayPause = () => {
    soundManager.playClick();
    if (isRunning) {
      // Pausing: stop running and stop ambient audio immediately
      setIsRunning(false);
      ambientAudio.stop();
      endTimeRef.current = null;
    } else {
      // Starting / Resuming: record target end timestamp to survive tab suspension
      endTimeRef.current = Date.now() + timeLeft * 1000;
      setIsRunning(true);
      // Ask for notification permission on first start (needs a user gesture)
      if (notifyEnabled) {
        ensureNotificationPermission();
      }
      if (ambientSound !== 'none') {
        // Soften volume slightly upon resume so it starts gently
        const currentVol = ambientAudio.getVolume();
        const softenedVol = Math.max(0.15, Math.min(0.4, currentVol > 0.4 ? currentVol - 0.15 : currentVol));
        ambientAudio.setVolume(softenedVol);
        setVolume(Math.round(softenedVol * 100));
        ambientAudio.playSound(ambientSound);
        // Automatically open the ambient sound menu for immediate control
        setShowAmbientMenu(true);
      }
    }
  };

  // Explicit End Session / Stop & Log early
  const handleEndSession = () => {
    soundManager.playClick();
    setIsRunning(false);
    ambientAudio.stop();
    endTimeRef.current = null;

    const elapsedSeconds = totalSeconds - timeLeft;
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

    if (elapsedSeconds >= 45 || timeLeft <= 60) {
      // Has worked meaningful minutes -> auto-log immediately & open completion dialog
      setLastCompletedMins(elapsedMinutes);
      if (mode === 'focus' && onLogToCurrentHour) {
        onLogToCurrentHour(
          taskText.trim() || (lang === 'ar' ? 'جلسة تركيز بومودورو' : 'Pomodoro Focus Session'),
          elapsedMinutes,
          selectedTag
        );
      }
      setShowCompletedPrompt(true);
    } else {
      // Less than 45 secs -> just reset timer
      setTimeLeft(totalSeconds);
    }
  };

  // Discard Session without logging to hour (إلغاء دون تسجيل)
  const handleDiscardSession = () => {
    soundManager.playClick();
    setIsRunning(false);
    ambientAudio.stop();
    endTimeRef.current = null;
    const secs = getDurationForMode(mode);
    setTotalSeconds(secs);
    setTimeLeft(secs);
  };

  // Handle Session Completion
  const handleTimerFinish = () => {
    setIsRunning(false);
    ambientAudio.stop();
    endTimeRef.current = null;
    soundManager.playTimerCompleteChime();

    // Alert the user if they are on another tab / app: notification + flashing title
    if (isNotifyEnabled() && document.hidden) {
      const finishedFocus = mode === 'focus';
      showTimerNotification(
        lang === 'ar'
          ? (finishedFocus ? '🎯 انتهت جلسة التركيز!' : '☕ انتهت الاستراحة!')
          : (finishedFocus ? '🎯 Focus session finished!' : '☕ Break is over!'),
        lang === 'ar'
          ? (finishedFocus ? 'أحسنت! ارجع للتطبيق لتصنيف الجلسة وأخذ استراحة.' : 'ارجع للتطبيق لبدء جلسة تركيز جديدة.')
          : (finishedFocus ? 'Great work! Return to the app to tag the session.' : 'Return to the app for a new focus session.')
      );
      setIsAlertFlashing(true);
      try { window.focus(); } catch {}
    }

    if (!isOpen && onRequestOpen) {
      onRequestOpen();
    }

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {}

    const completedMins = Math.round(totalSeconds / 60);
    setLastCompletedMins(completedMins);

    if (mode === 'focus') {
      // Auto-log immediately to current hour so work is NEVER lost!
      if (onLogToCurrentHour) {
        onLogToCurrentHour(
          taskText.trim() || (lang === 'ar' ? 'جلسة تركيز بومودورو' : 'Pomodoro Focus Session'),
          completedMins,
          selectedTag
        );
      }
      setShowCompletedPrompt(true);
      // Advance session count
      const nextSession = sessionCount >= 4 ? 1 : sessionCount + 1;
      setSessionCount(nextSession);
    } else {
      // Finished break -> return to focus
      setMode('focus');
      const secs = focusDurationMin * 60;
      setTotalSeconds(secs);
      setTimeLeft(secs);
    }
  };

  // Timer Tick with wall-clock calculation, Web Worker & visibilitychange resilience (continues in background when minimized)
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (!endTimeRef.current) {
      endTimeRef.current = Date.now() + timeLeft * 1000;
    }

    const syncRemaining = () => {
      if (!endTimeRef.current) return;
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        endTimeRef.current = null;
        handleTimerFinish();
      }
    };

    // Immediate calculation
    syncRemaining();

    // Standard interval
    timerRef.current = window.setInterval(syncRemaining, 1000);

    // Background Web Worker to keep timer alive in throttled background tabs
    let worker: Worker | null = null;
    try {
      const blob = new Blob([
        `let t=null;self.onmessage=function(e){if(e.data==='start'){if(t)clearInterval(t);t=setInterval(function(){self.postMessage('tick')},1000)}else if(e.data==='stop'){if(t)clearInterval(t);t=null}}`
      ], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      worker = new Worker(workerUrl);
      URL.revokeObjectURL(workerUrl);
      worker.onmessage = () => {
        syncRemaining();
      };
      worker.postMessage('start');
    } catch {}

    // Listen to tab visibility & window focus
    const handleSync = () => syncRemaining();
    document.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (worker) {
        worker.postMessage('stop');
        worker.terminate();
      }
      document.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [isRunning, isOpen]);

  // Dynamic tab title displaying countdown (even when minimized)
  useEffect(() => {
    const originalTitle = document.title;
    if (isRunning) {
      const mins = Math.floor(timeLeft / 60);
      const secs = timeLeft % 60;
      const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      const modeIcon = mode === 'focus' ? '🎯' : '☕';
      document.title = `(${formatted}) ${modeIcon} Time Log`;
    }
    return () => {
      document.title = originalTitle;
    };
  }, [isRunning, timeLeft, mode]);

  // Flashing tab title after timer finished while the tab is hidden, until the user returns
  useEffect(() => {
    if (!isAlertFlashing) return;
    const originalTitle = document.title.startsWith('🔔') ? 'Time Log' : document.title;
    const alertTitle = lang === 'ar' ? '🔔 انتهى الوقت! — Time Log' : '🔔 Time is up! — Time Log';
    let on = false;
    const id = window.setInterval(() => {
      on = !on;
      document.title = on ? alertTitle : originalTitle;
    }, 900);
    const stop = () => {
      if (!document.hidden) setIsAlertFlashing(false);
    };
    document.addEventListener('visibilitychange', stop);
    window.addEventListener('focus', stop);
    return () => {
      window.clearInterval(id);
      document.title = originalTitle;
      document.removeEventListener('visibilitychange', stop);
      window.removeEventListener('focus', stop);
    };
  }, [isAlertFlashing, lang]);

  // Toggle Fullscreen
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      setIsFullscreen(!isFullscreen);
    }
  };

  // Keyboard Shortcuts (Space for play/pause, Esc for exit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlayPause();
      } else if (e.code === 'Escape') {
        if (showCompletedPrompt) {
          setShowCompletedPrompt(false);
        } else {
          if (!isRunning) {
            ambientAudio.stop();
          }
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showCompletedPrompt, isRunning, ambientSound, onClose]);

  // Stop sound on unmount
  useEffect(() => {
    return () => {
      ambientAudio.stop();
    };
  }, []);

  // Format Time Display (MM:SS)
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Notify parent of running state & formatted countdown for background badge
  useEffect(() => {
    if (onTimerStateChange) {
      onTimerStateChange({ isRunning, timeFormatted, mode });
    }
  }, [isRunning, timeFormatted, mode, onTimerStateChange]);

  // Progress Calculation
  const progressPercent = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;
  const radius = 135;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Active theme colors according to mode
  const themeStyles = useMemo(() => {
    if (mode === 'focus') {
      return {
        accent: 'text-indigo-600 dark:text-indigo-400',
        bgGlow: 'from-indigo-500/10 via-purple-500/5 to-transparent',
        border: 'border-indigo-500/30',
        ringStroke: 'stroke-indigo-600 dark:stroke-indigo-400',
        trackStroke: 'stroke-slate-200 dark:stroke-slate-800',
        chipActive: 'bg-indigo-600 text-white shadow-indigo-500/25',
        label: t.pomoFocus,
        icon: '🎯'
      };
    }
    if (mode === 'shortBreak') {
      return {
        accent: 'text-emerald-600 dark:text-emerald-400',
        bgGlow: 'from-emerald-500/10 via-teal-500/5 to-transparent',
        border: 'border-emerald-500/30',
        ringStroke: 'stroke-emerald-500 dark:stroke-emerald-400',
        trackStroke: 'stroke-slate-200 dark:stroke-slate-800',
        chipActive: 'bg-emerald-600 text-white shadow-emerald-500/25',
        label: t.pomoShortBreak,
        icon: '☕'
      };
    }
    return {
      accent: 'text-amber-600 dark:text-amber-400',
      bgGlow: 'from-amber-500/10 via-orange-500/5 to-transparent',
      border: 'border-amber-500/30',
      ringStroke: 'stroke-amber-500 dark:stroke-amber-400',
      trackStroke: 'stroke-slate-200 dark:stroke-slate-800',
      chipActive: 'bg-amber-600 text-white shadow-amber-500/25',
      label: t.pomoLongBreak,
      icon: '🌴'
    };
  }, [mode, t]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none font-sans overflow-hidden animate-in fade-in duration-200"
    >
      {/* Outer subtle background glow */}
      <div
        className={`absolute inset-0 bg-radial ${themeStyles.bgGlow} pointer-events-none transition-all duration-700`}
        onClick={(e) => {
          // Close/minimize if clicking outside the card
          if (e.target === e.currentTarget && !showCompletedPrompt) {
            if (!isRunning) {
              ambientAudio.stop();
            }
            onClose();
          }
        }}
      />

      {/* CENTERED COMPACT POMODORO CARD (المربع الملموم والمتجاوب مع المظهر) */}
      <div
        className={`relative z-10 w-full max-w-md bg-[var(--card)] border border-[var(--line)] ${themeStyles.border} rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl flex flex-col items-center transition-all duration-300 animate-in zoom-in-95`}
      >
        {/* TOP HEADER: Session Counter + Controls + Theme + Exit */}
        <header className="w-full flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[var(--line)]">
          {/* Left: Pomodoro Session Indicator */}
          <div className="flex items-center gap-1.5 bg-[var(--bg)] border border-[var(--line)] rounded-xl px-2.5 py-1 shadow-2xs">
            <span className="text-xs sm:text-sm">🍅</span>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--ink-soft)]">
              <span>{t.pomoSession}</span>
              <span className="font-bold text-[var(--ink)] font-mono">{sessionCount}</span>
              <span className="text-[var(--ink-faint)]">{t.pomoOf}</span>
              <span className="font-mono text-[var(--ink-soft)]">4</span>
            </div>

            {/* Dots Indicator */}
            <div className="flex items-center gap-1 ms-1.5 border-s border-[var(--line)] ps-1.5">
              {[1, 2, 3, 4].map((dot) => (
                <div
                  key={dot}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    dot <= sessionCount
                      ? 'bg-rose-500 ring-2 ring-rose-500/30'
                      : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Right: Ambient Sound + Theme Toggle + Fullscreen + Exit */}
          <div className="flex items-center gap-1.5">
            {/* Finish Alert (notification + flashing tab) Toggle */}
            <button
              type="button"
              onClick={handleToggleNotify}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                notifyEnabled
                  ? 'border-indigo-500/60 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-200'
                  : 'border-[var(--line)] bg-[var(--bg)] hover:bg-[var(--card)] text-[var(--ink-faint)]'
              }`}
              title={
                notifyEnabled
                  ? (lang === 'ar' ? 'تنبيه انتهاء المؤقت: مفعّل (إشعار + وميض التبويب)' : 'Finish alert: ON (notification + flashing tab)')
                  : (lang === 'ar' ? 'تنبيه انتهاء المؤقت: متوقف' : 'Finish alert: OFF')
              }
            >
              {notifyEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
            </button>

            {/* Ambient Sound Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAmbientMenu((prev) => !prev)}
                className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  ambientSound !== 'none'
                    ? 'border-indigo-500/60 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-200 shadow-indigo-500/20 shadow-xs'
                    : 'border-[var(--line)] bg-[var(--bg)] hover:bg-[var(--card)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
                }`}
                title={t.pomoAmbientMusic}
              >
                <span>{AMBIENT_SOUND_OPTIONS.find((o) => o.id === ambientSound)?.icon || '🎵'}</span>
                <span className="hidden xs:inline">
                  {ambientSound !== 'none'
                    ? (lang === 'ar'
                        ? AMBIENT_SOUND_OPTIONS.find((o) => o.id === ambientSound)?.labelAr
                        : AMBIENT_SOUND_OPTIONS.find((o) => o.id === ambientSound)?.labelEn)
                    : (lang === 'ar' ? 'موسيقى' : 'Music')}
                </span>
              </button>

              {/* Ambient Sound Dropdown Menu */}
              {showAmbientMenu && (
                <div className="absolute top-full mt-2 end-0 w-56 sm:w-60 bg-[var(--card)] border border-[var(--line)] rounded-2xl p-2.5 shadow-2xl backdrop-blur-2xl z-30 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--line)]">
                    <span className="text-[11px] font-bold text-[var(--ink)] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      {t.pomoAmbientMusic}
                    </span>
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="p-1 text-[var(--ink-soft)] hover:text-[var(--ink)] rounded-lg hover:bg-[var(--bg)] transition-all cursor-pointer"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Sound Options List */}
                  <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto custom-scrollbar">
                    {AMBIENT_SOUND_OPTIONS.map((opt) => {
                      const isSelected = ambientSound === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            handleSelectSound(opt.id);
                            setShowAmbientMenu(false);
                          }}
                          className={`w-full px-2 py-1.5 rounded-lg text-[11px] font-medium text-start flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'text-[var(--ink-soft)] hover:bg-[var(--bg)] hover:text-[var(--ink)]'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span>{opt.icon}</span>
                            <span>{lang === 'ar' ? opt.labelAr : opt.labelEn}</span>
                          </span>
                          {isSelected && <span className="text-[10px]">✓</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Volume Slider */}
                  <div className="mt-2 pt-2 border-t border-[var(--line)] flex items-center gap-2">
                    <span className="text-[10px] text-[var(--ink-soft)] shrink-0">{t.pomoVolume}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                      className="w-full accent-indigo-600 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-[var(--ink-soft)] w-6 text-end">
                      {isMuted ? '0%' : `${volume}%`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Fast Theme Switch inside Timer */}
            {onCycleThemeMode && (
              <button
                type="button"
                onClick={onCycleThemeMode}
                className="p-1.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] hover:bg-[var(--card-subtle)] text-[var(--ink-soft)] hover:text-[var(--ink)] transition-all cursor-pointer"
                title={
                  themeMode === 'system'
                    ? (lang === 'ar' ? `المظهر: الجهاز (${isDarkEffective ? 'ليلي' : 'نهاري'})` : `Theme: System (${isDarkEffective ? 'Dark' : 'Light'})`)
                    : themeMode === 'dark'
                    ? (lang === 'ar' ? 'المظهر: ليلي (أسود)' : 'Theme: Dark')
                    : (lang === 'ar' ? 'المظهر: نهاري' : 'Theme: Light')
                }
              >
                {themeMode === 'system' ? (
                  <Laptop className="w-3.5 h-3.5 text-indigo-500" />
                ) : themeMode === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                )}
              </button>
            )}

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] hover:bg-[var(--card-subtle)] text-[var(--ink-soft)] hover:text-[var(--ink)] transition-all cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Exit / Minimize Focus Mode Button */}
            <button
              type="button"
              onClick={() => {
                if (!isRunning) {
                  ambientAudio.stop();
                }
                onClose();
              }}
              className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-300 hover:text-rose-700 dark:hover:text-rose-100 transition-all cursor-pointer shadow-2xs"
              title={
                isRunning
                  ? lang === 'ar'
                    ? 'تصغير النافذة (سيستمر المؤقت في الخلفية)'
                    : 'Minimize (timer keeps running in background)'
                  : t.focusModeExitBtn
              }
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Mode Selector Tabs (Focus / Short Break / Long Break) */}
        <div className="w-full bg-[var(--bg)] p-1 rounded-2xl border border-[var(--line)] flex items-center justify-between gap-1 mb-2.5">
          <button
            type="button"
            onClick={() => handleSwitchMode('focus')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'focus'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--card)]'
            }`}
          >
            <span>🎯</span>
            <span className="truncate">{t.pomoFocus}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchMode('shortBreak')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'shortBreak'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--card)]'
            }`}
          >
            <span>☕</span>
            <span className="truncate">{t.pomoShortBreak}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchMode('longBreak')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'longBreak'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--card)]'
            }`}
          >
            <span>🌴</span>
            <span className="truncate">{t.pomoLongBreak}</span>
          </button>
        </div>

        {/* Quick Focus Duration Presets - Fixed Container (Zero Layout Shift) */}
        <div className="w-full h-7 flex items-center justify-center mb-1.5 shrink-0">
          {mode === 'focus' ? (
            <div className="flex items-center gap-1.5">
              {PRESET_DURATIONS.focus.map((mins) => {
                const isSelected = focusDurationMin === mins && !isEditingCustomMin;
                return (
                  <button
                    key={mins}
                    type="button"
                    disabled={isRunning}
                    onClick={() => {
                      if (isRunning) return;
                      setFocusDurationMin(mins);
                      handleSwitchMode('focus', mins);
                    }}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold transition-all border ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-200 shadow-2xs'
                        : isRunning
                        ? 'border-[var(--line)] bg-[var(--bg)] text-[var(--ink-faint)] cursor-not-allowed opacity-50'
                        : 'border-[var(--line)] bg-[var(--bg)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:border-indigo-400 cursor-pointer'
                    }`}
                  >
                    {mins}m
                  </button>
                );
              })}

              {/* Manual Custom Duration Input / Button */}
              {isEditingCustomMin && !isRunning ? (
                <div className="flex items-center gap-1 bg-[var(--bg)] border border-indigo-500 rounded-lg px-1.5 py-0.5 shadow-2xs">
                  <input
                    type="number"
                    min={1}
                    max={240}
                    autoFocus
                    value={customMinInput}
                    onChange={(e) => setCustomMinInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyCustomMinutes();
                      } else if (e.key === 'Escape') {
                        e.stopPropagation();
                        setIsEditingCustomMin(false);
                      }
                    }}
                    onBlur={handleApplyCustomMinutes}
                    placeholder="30"
                    className="w-10 text-center text-[11px] font-mono font-bold bg-transparent text-[var(--ink)] outline-hidden"
                  />
                  <span className="text-[10px] font-mono text-[var(--ink-soft)]">m</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={() => {
                    if (isRunning) return;
                    setCustomMinInput(String(focusDurationMin));
                    setIsEditingCustomMin(true);
                  }}
                  title={lang === 'ar' ? 'إدخال مدة مخصصة بالدقائق (1 - 240 دقيقة)' : 'Enter custom duration in minutes (1 - 240m)'}
                  className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-1 ${
                    !PRESET_DURATIONS.focus.includes(focusDurationMin)
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-200 shadow-2xs font-mono'
                      : isRunning
                      ? 'border-[var(--line)] bg-[var(--bg)] text-[var(--ink-faint)] cursor-not-allowed opacity-50'
                      : 'border-[var(--line)] bg-[var(--bg)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:border-indigo-400 cursor-pointer'
                  }`}
                >
                  <span>✏️</span>
                  <span>
                    {!PRESET_DURATIONS.focus.includes(focusDurationMin)
                      ? `${focusDurationMin}m`
                      : lang === 'ar'
                      ? 'مخصص'
                      : 'Custom'}
                  </span>
                </button>
              )}
            </div>
          ) : (
            <div className="text-[11px] font-medium text-[var(--ink-soft)] flex items-center gap-1">
              <span>{mode === 'shortBreak' ? '☕' : '🌴'}</span>
              <span>{mode === 'shortBreak' ? (lang === 'ar' ? 'استراحة سريعة لإنعاش التركيز' : 'Quick refresh break') : (lang === 'ar' ? 'استراحة طويلة للاسترخاء' : 'Long deep break')}</span>
            </div>
          )}
        </div>

        {/* Circular Animated Progress Countdown Timer */}
        <div className="relative flex items-center justify-center my-1">
          <svg className="w-52 h-52 sm:w-56 sm:h-56 -rotate-90 transform" viewBox="0 0 320 320">
            {/* Background Track Circle */}
            <circle
              cx="160"
              cy="160"
              r={radius}
              className={`${themeStyles.trackStroke} transition-all`}
              strokeWidth="9"
              fill="transparent"
            />
            {/* Active Countdown Ring */}
            <circle
              cx="160"
              cy="160"
              r={radius}
              className={`${themeStyles.ringStroke} transition-all duration-500`}
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Center Digital Display & Status */}
          <div className="absolute flex flex-col items-center justify-center text-center px-4">
            <span
              onClick={() => {
                if (mode === 'focus' && !isRunning) {
                  setCustomMinInput(String(focusDurationMin));
                  setIsEditingCustomMin(true);
                }
              }}
              title={
                mode === 'focus' && !isRunning
                  ? lang === 'ar'
                    ? 'انقر لتحديد مدة مخصصة بالدقائق'
                    : 'Click to set custom minutes'
                  : undefined
              }
              className={`text-4xl sm:text-5xl font-black font-mono tracking-tight text-[var(--ink)] drop-shadow-2xs ${
                mode === 'focus' && !isRunning ? 'cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors' : ''
              }`}
            >
              {timeFormatted}
            </span>

            <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--ink-soft)] bg-[var(--bg)] border border-[var(--line)] px-2.5 py-0.5 rounded-full shadow-2xs">
              <span className="animate-pulse">{themeStyles.icon}</span>
              <span>{themeStyles.label}</span>
              {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping ms-0.5" />}
            </span>
          </div>
        </div>

        {/* Focus Task Note Input */}
        <div className="w-full mt-2">
          <input
            type="text"
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            placeholder={t.pomoTaskPlaceholder}
            className="w-full bg-[var(--bg)] border border-[var(--line)] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-[var(--ink)] placeholder-[var(--ink-faint)] text-xs px-3.5 py-2 rounded-xl transition-all text-center focus:text-start outline-hidden"
          />
        </div>

        {/* Primary Controls: Reset / Play-Pause / End Session / Skip */}
        <div className="flex items-center justify-center gap-2 mt-3.5 w-full">
          {/* Reset / Discard Button */}
          <button
            type="button"
            onClick={handleDiscardSession}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 ${
              timeLeft < totalSeconds || isRunning
                ? 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-300 hover:text-amber-700 dark:hover:text-amber-100'
                : 'bg-[var(--bg)] hover:bg-[var(--card)] border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
            title={
              timeLeft < totalSeconds || isRunning
                ? (lang === 'ar' ? 'إلغاء وإعادة ضبط المؤقت دون تسجيل' : 'Cancel & reset timer without saving')
                : t.pomoReset
            }
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Big Play / Pause Action Button */}
          <button
            type="button"
            onClick={handleTogglePlayPause}
            className={`flex-1 max-w-[170px] py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md hover:scale-105 active:scale-95 ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white ring-4 ring-amber-500/20'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white ring-4 ring-indigo-500/30'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>{t.pomoPause}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>{timeLeft < totalSeconds ? t.pomoResume : t.pomoStart}</span>
              </>
            )}
          </button>

          {/* End / Log Session Button (إنهاء وحفظ الجلسة) */}
          <button
            type="button"
            onClick={handleEndSession}
            className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-300 hover:text-rose-700 dark:hover:text-rose-100 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
            title={lang === 'ar' ? 'إنهاء وحفظ الجلسة الآن في الساعة' : 'Finish & Save Session to Hour'}
          >
            <Square className="w-4 h-4 fill-current text-rose-500" />
          </button>

          {/* Skip / Next Session Button */}
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              ambientAudio.stop();
              if (mode === 'focus') {
                handleSwitchMode(sessionCount % 4 === 0 ? 'longBreak' : 'shortBreak');
              } else {
                handleSwitchMode('focus');
              }
            }}
            className="p-2.5 rounded-2xl bg-[var(--bg)] hover:bg-[var(--card)] border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)] transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
            title={t.pomoSkip}
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* BOTTOM FOOTER: Keyboard shortcuts hint */}
        <footer className="w-full flex items-center justify-between text-[10px] text-[var(--ink-faint)] pt-3 mt-3 border-t border-[var(--line)]">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--line)] text-[var(--ink-soft)] font-mono text-[9px]">
              Space
            </kbd>
            <span>{lang === 'ar' ? 'تشغيل / إيقاف' : 'Play / Pause'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--line)] text-[var(--ink-soft)] font-mono text-[9px]">
              Esc
            </kbd>
            <span>{lang === 'ar' ? 'إغلاق' : 'Close'}</span>
          </div>
        </footer>
      </div>

      {/* COMPLETION MODAL (Save session to Today's Hours) */}
      {showCompletedPrompt && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[var(--card)] border border-[var(--line)] rounded-3xl p-6 max-w-md w-full shadow-2xl text-center flex flex-col items-center gap-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 flex items-center justify-center text-2xl">
              🎉
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--ink)]">{t.pomoCompleteTitle}</h3>
              <p className="text-xs text-[var(--ink-soft)] mt-1">
                {lang === 'ar'
                  ? `أنجزت جلسة تركيز مدتها ${lastCompletedMins} دقيقة بنجاح!`
                  : `You completed a ${lastCompletedMins} min focus session!`}
              </p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{lang === 'ar' ? 'تم تسجيل الجلسة تلقائياً في الساعة الحالية ✓' : 'Session auto-logged to current hour ✓'}</span>
              </div>
            </div>

            {/* Tag Selection for Logging */}
            <div className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-2xl p-3 text-start">
              <label className="block text-[11px] font-bold text-[var(--ink-soft)] mb-2 flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5 text-indigo-500" />
                {lang === 'ar' ? 'تصنيف النشاط المنجز:' : 'Activity Tag:'}
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {POMO_TAG_KEYS.map((tagKey) => {
                  const cfg = TAGS_CONFIG[tagKey];
                  const isSelected = selectedTag === tagKey;
                  const shortLabel = TAG_SHORT_LABELS[tagKey]?.[lang] || tagKey;
                  return (
                    <button
                      key={tagKey}
                      type="button"
                      onClick={() => setSelectedTag(tagKey)}
                      title={cfg.fullTitle[lang]}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                          : 'border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)]'
                      }`}
                    >
                      <span className="font-mono text-xs font-black">{tagKey}</span>
                      <span className="text-[11px] font-semibold tracking-tight">{shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onLogToCurrentHour) {
                    onLogToCurrentHour(
                      taskText.trim() || (lang === 'ar' ? 'جلسة تركيز بومودورو' : 'Pomodoro Focus Session'),
                      lastCompletedMins,
                      selectedTag
                    );
                  }
                  setShowCompletedPrompt(false);
                  handleSwitchMode(sessionCount % 4 === 0 ? 'longBreak' : 'shortBreak');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{lang === 'ar' ? 'تأكيد التعديلات ومتابعة' : 'Confirm & Continue'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCompletedPrompt(false);
                  handleSwitchMode(sessionCount % 4 === 0 ? 'longBreak' : 'shortBreak');
                }}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-[var(--bg)] hover:bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] text-xs font-bold transition-all cursor-pointer"
              >
                {lang === 'ar' ? 'استمرار للاستراحة' : 'Continue to Break'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
