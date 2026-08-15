import React, { useState, useEffect, useRef } from 'react';
import { STRINGS } from '../constants/config';
import { pad2 } from '../utils/dateUtils';
import { soundManager } from '../utils/soundEffects';
import { Timer, Square, X, Bell, Play, Flame, ChevronDown, Target } from 'lucide-react';

interface TimerBarProps {
  onTimerComplete: (start: Date, end: Date) => void;
  showFocusButton?: boolean;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  lang: 'ar' | 'en';
}

export const TimerBar: React.FC<TimerBarProps> = ({
  onTimerComplete,
  showFocusButton = true,
  isFocusMode = false,
  onToggleFocusMode,
  lang
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);
  const [targetDurationSec, setTargetDurationSec] = useState<number | null>(null); // null means open count-up
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const t = STRINGS[lang];

  // Restore saved active timer
  useEffect(() => {
    const savedStart = localStorage.getItem('activeTimerStart');
    const savedDuration = localStorage.getItem('activeTimerTargetSec');
    if (savedStart) {
      const ts = parseInt(savedStart, 10);
      setStartTimestamp(ts);
      if (savedDuration) {
        setTargetDurationSec(parseInt(savedDuration, 10));
      }
      setIsRunning(true);
    }
  }, []);

  // Close presets menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowPresetsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Timer Tick Interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && startTimestamp) {
      interval = setInterval(() => {
        const diff = Math.max(0, Math.floor((Date.now() - startTimestamp) / 1000));
        setElapsedSeconds(diff);

        // Check if target duration reached in countdown mode
        if (targetDurationSec && diff >= targetDurationSec) {
          // Play pleasant chime
          soundManager.playTimerCompleteChime();
        }
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startTimestamp, targetDurationSec]);

  // Start Count-up or Countdown Timer
  const startTimer = (durationSeconds: number | null = null) => {
    soundManager.playClick();
    const now = Date.now();
    setStartTimestamp(now);
    setTargetDurationSec(durationSeconds);
    setIsRunning(true);
    setShowPresetsMenu(false);
    localStorage.setItem('activeTimerStart', String(now));
    if (durationSeconds) {
      localStorage.setItem('activeTimerTargetSec', String(durationSeconds));
    } else {
      localStorage.removeItem('activeTimerTargetSec');
    }
  };

  const handleStop = () => {
    if (!startTimestamp) return;
    soundManager.playClick();
    const start = new Date(startTimestamp);
    const end = new Date();
    setIsRunning(false);
    setStartTimestamp(null);
    setTargetDurationSec(null);
    localStorage.removeItem('activeTimerStart');
    localStorage.removeItem('activeTimerTargetSec');
    onTimerComplete(start, end);
  };

  const handleCancel = () => {
    soundManager.playClick();
    setIsRunning(false);
    setStartTimestamp(null);
    setTargetDurationSec(null);
    localStorage.removeItem('activeTimerStart');
    localStorage.removeItem('activeTimerTargetSec');
  };

  // Formatter for countdown or count-up
  const isCountdown = targetDurationSec !== null;
  const isFinishedCountdown = isCountdown && elapsedSeconds >= targetDurationSec;
  const remainingSeconds = isCountdown ? Math.max(0, targetDurationSec - elapsedSeconds) : elapsedSeconds;

  const h = Math.floor((isCountdown ? remainingSeconds : elapsedSeconds) / 3600);
  const m = Math.floor(((isCountdown ? remainingSeconds : elapsedSeconds) % 3600) / 60);
  const s = (isCountdown ? remainingSeconds : elapsedSeconds) % 60;
  const timeFormatted = `${pad2(h)}:${pad2(m)}:${pad2(s)}`;

  // Progress percentage for countdown
  const progressPct = isCountdown && targetDurationSec > 0
    ? Math.min(100, Math.round((elapsedSeconds / targetDurationSec) * 100))
    : 0;

  return (
    <div className="w-full">
      {!isRunning ? (
        <div className="flex items-center gap-1.5 w-full" ref={menuRef}>
          {/* Main Direct Start (Count-up) */}
          <button
            type="button"
            onClick={() => startTimer(null)}
            className="flex-1 min-w-0 bg-slate-100 hover:bg-slate-200/90 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:border-indigo-500 dark:hover:border-indigo-400 text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-300 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer group whitespace-nowrap"
          >
            <Timer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="truncate">{t.timerStartBtnText}</span>
          </button>

          {/* Focus Mode Button next to Timer (shown on desktop / iPad next to start timer and before 1h, 2h, 3h) */}
          {showFocusButton && onToggleFocusMode && (
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onToggleFocusMode();
              }}
              title={lang === 'ar' ? (isFocusMode ? 'إيقاف وضع التركيز' : 'تفعيل وضع التركيز') : (isFocusMode ? 'Exit Focus Mode' : 'Enter Focus Mode')}
              className={`hidden md:inline-flex px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs cursor-pointer items-center gap-1.5 whitespace-nowrap shrink-0 ${
                isFocusMode
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-indigo-500/20 shadow-md ring-2 ring-indigo-400/40'
                  : 'bg-slate-100 hover:bg-indigo-50 hover:border-indigo-400 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300'
              }`}
            >
              <Target className={`w-3.5 h-3.5 ${isFocusMode ? 'text-white animate-pulse' : 'text-indigo-600 dark:text-indigo-400'}`} />
              <span>{t.focusModeBtnText}</span>
            </button>
          )}

          {/* Quick Preset Buttons (1h, 2h, 3h Countdown) */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => startTimer(3600)}
              title={lang === 'ar' ? 'بدء تايمر عد تنازلي لساعة واحدة (60 دقيقة)' : 'Start 1 hour countdown'}
              className="bg-slate-100 hover:bg-indigo-50 hover:border-indigo-400 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-0.5 whitespace-nowrap"
            >
              <span className="font-mono text-indigo-600 dark:text-indigo-400">1</span>
              <span>{lang === 'ar' ? 'س' : 'h'}</span>
            </button>

            <button
              type="button"
              onClick={() => startTimer(7200)}
              title={lang === 'ar' ? 'بدء تايمر عد تنازلي لساعتين (120 دقيقة)' : 'Start 2 hours countdown'}
              className="bg-slate-100 hover:bg-indigo-50 hover:border-indigo-400 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-0.5 whitespace-nowrap"
            >
              <span className="font-mono text-indigo-600 dark:text-indigo-400">2</span>
              <span>{lang === 'ar' ? 'س' : 'h'}</span>
            </button>

            <button
              type="button"
              onClick={() => startTimer(10800)}
              title={lang === 'ar' ? 'بدء تايمر عد تنازلي لـ 3 ساعات (180 دقيقة)' : 'Start 3 hours countdown'}
              className="bg-slate-100 hover:bg-indigo-50 hover:border-indigo-400 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-0.5 whitespace-nowrap"
            >
              <span className="font-mono text-indigo-600 dark:text-indigo-400">3</span>
              <span>{lang === 'ar' ? 'س' : 'h'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Active Running Timer Banner */
        <div
          className={`border rounded-xl p-2.5 flex items-center justify-between gap-3 shadow-sm transition-all ${
            isFinishedCountdown
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 animate-pulse'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60'
          }`}
        >
          {/* Clock Display and Mode */}
          <div className="flex items-center gap-2.5">
            <div
              className={`p-1.5 rounded-lg ${
                isFinishedCountdown
                  ? 'bg-emerald-500 text-white animate-bounce'
                  : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
              }`}
            >
              {isFinishedCountdown ? (
                <Bell className="w-4 h-4" />
              ) : (
                <Timer className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
              )}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 font-mono font-black text-base sm:text-lg text-slate-900 dark:text-white leading-none">
                <span>{timeFormatted}</span>
                {isCountdown && (
                  <span className="text-[10px] font-sans font-bold bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded-md">
                    {isFinishedCountdown
                      ? lang === 'ar' ? 'اكتملت المدة 🔔' : 'Done 🔔'
                      : `${targetDurationSec / 3600} ${lang === 'ar' ? 'ساعة تنازلي' : 'h target'}`}
                  </span>
                )}
              </div>
              {isCountdown && !isFinishedCountdown && (
                <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold mt-0.5">
                  {lang === 'ar' ? `متبقي من الجلسة (${progressPct}%)` : `Remaining (${progressPct}%)`}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleStop}
              className={`text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                isFinishedCountdown
                  ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-400'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{t.timerStopBtnText}</span>
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="bg-white dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 p-2 rounded-xl transition-all cursor-pointer shadow-2xs"
              title={lang === 'ar' ? 'إلغاء التايمر' : 'Cancel Timer'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
