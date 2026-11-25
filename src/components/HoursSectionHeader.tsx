import React from 'react';
import { Cake, Flame, Target } from 'lucide-react';
import { STRINGS } from '../constants/config';
import { soundManager } from '../utils/soundEffects';
import type { PomoBgState } from '../hooks/useModalState';

interface HoursSectionHeaderProps {
  lang: 'ar' | 'en';
  showStreakBadge: boolean;
  dailyStreak: number;
  /** The focus button is only offered on today's page. */
  showFocusButton: boolean;
  focusModeActive: boolean;
  pomoBgState: PomoBgState;
  onToggleFocusMode: (enabled?: boolean) => void;
  ageDisplayValue: string;
  ageUnit: string;
  onOpenSettings: () => void;
  loggedCount: number;
  totalActiveHours: number;
  /** The "focus mode is on" banner shows under the header on today's page. */
  showFocusBanner: boolean;
}

/**
 * Header of the "Today's Hours" card (extracted from App.tsx): title, streak,
 * focus-mode button, age badge and logged count — on one row from md up, with
 * the focus button and age badge on a second row on phones — plus the
 * focus-mode banner.
 */
export const HoursSectionHeader: React.FC<HoursSectionHeaderProps> = ({
  lang,
  showStreakBadge,
  dailyStreak,
  showFocusButton,
  focusModeActive,
  pomoBgState,
  onToggleFocusMode,
  ageDisplayValue,
  ageUnit,
  onOpenSettings,
  loggedCount,
  totalActiveHours,
  showFocusBanner
}) => {
  const t = STRINGS[lang];
  const ar = lang === 'ar';
  const focusOn = focusModeActive || pomoBgState.isRunning;

  const focusTitle = ar
    ? pomoBgState.isRunning
      ? `مؤقت التركيز يعمل في الخلفية (${pomoBgState.timeFormatted}) — انقر للفتح`
      : focusModeActive
        ? 'إيقاف وضع التركيز'
        : 'فتح مؤقت التركيز (بومودورو)'
    : pomoBgState.isRunning
      ? `Focus Timer running (${pomoBgState.timeFormatted}) — Click to open`
      : focusModeActive
        ? 'Exit Focus Mode'
        : 'Open Focus Timer (Pomodoro)';

  /** `layoutClass` differs between the desktop (row 1) and mobile (row 2) copies. */
  const focusButton = (layoutClass: string) => (
    <button
      type="button"
      onClick={() => {
        soundManager.playClick();
        onToggleFocusMode();
      }}
      title={focusTitle}
      className={`${layoutClass} px-3 rounded-xl border text-xs font-bold transition-all shadow-xs cursor-pointer items-center gap-1.5 whitespace-nowrap ${
        focusOn
          ? 'border-indigo-600 bg-indigo-600 text-white shadow-indigo-500/20 shadow-md ring-2 ring-indigo-400/40'
          : 'bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/70 border-indigo-200 dark:border-indigo-800/70 text-indigo-700 dark:text-indigo-300'
      }`}
    >
      <Target className={`w-3.5 h-3.5 ${focusOn ? 'text-white animate-pulse' : 'text-indigo-600 dark:text-indigo-400'}`} />
      <span>{t.focusModeBtnText}</span>
      {pomoBgState.isRunning && (
        <span className="inline-flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded-md font-mono text-[11px] font-black tracking-tight text-white">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
          <span>{pomoBgState.timeFormatted}</span>
        </span>
      )}
    </button>
  );

  const ageTitle = ar ? `العمر: ${ageDisplayValue} ${ageUnit} (انقر للإعدادات)` : `Age: ${ageDisplayValue} ${ageUnit} (Click for settings)`;
  const ageBadge = (layoutClass: string, unitSize: string) => (
    <button
      type="button"
      onClick={onOpenSettings}
      className={`${layoutClass} bg-rose-50/90 hover:bg-rose-100/90 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200/90 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 px-2.5 text-xs font-semibold items-center gap-1.5 shadow-2xs cursor-pointer hover:border-rose-400 dark:hover:border-rose-600 select-none shrink-0 transition-all`}
      title={ageTitle}
    >
      <Cake className="w-3.5 h-3.5 text-rose-500 shrink-0" />
      <span className="font-bold font-mono text-[var(--ink)]">{ageDisplayValue}</span>
      <span className={`${unitSize} text-rose-600 dark:text-rose-400 font-bold`}>{ageUnit}</span>
    </button>
  );

  return (
    <>
      <div className="flex flex-col gap-2 pb-2.5 mb-3 border-b border-[var(--line)]">
        {/* ROW 1: title + streak + [md+: focus button] … [md+: age] + logged count */}
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2 shrink-0">
            <h2 className="font-bold text-sm sm:text-base text-[var(--ink)] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0"></span>
              <span>{t.hoursTitle}</span>
            </h2>

            {showStreakBadge && (
              <div
                className={`px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs border transition-all ${
                  dailyStreak > 0
                    ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800/80 text-orange-600 dark:text-orange-400'
                    : 'bg-[var(--bg)] border-[var(--line)] text-[var(--ink-faint)]'
                }`}
                title={
                  dailyStreak > 0
                    ? t.streakTooltip(dailyStreak)
                    : ar
                      ? 'سجّل ساعاتك يومياً للحفاظ على شعلة الاستمرارية 🔥'
                      : 'Log hours daily to build your streak 🔥'
                }
              >
                <Flame className={`w-3.5 h-3.5 ${dailyStreak > 0 ? 'text-orange-500 fill-orange-500 animate-pulse' : 'text-slate-400'}`} />
                <span className="font-mono">{dailyStreak}</span>
                <span className="text-[10px] font-normal">{ar ? 'يوم' : 'd'}</span>
              </div>
            )}

            {showFocusButton && focusButton('hidden md:inline-flex py-1 shrink-0')}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {ageDisplayValue && ageBadge('hidden md:inline-flex py-0.5 rounded-lg', 'text-[10px]')}
            <span className="text-[11px] sm:text-xs font-semibold text-[var(--ink-soft)] bg-[var(--bg)] border border-[var(--line)] px-2.5 py-0.5 rounded-lg shrink-0">
              {ar ? `${loggedCount} من ${totalActiveHours} مسجلة` : `${loggedCount}/${totalActiveHours} logged`}
            </span>
          </div>
        </div>

        {/* ROW 2 (phones only): focus button + age badge */}
        {(showFocusButton || ageDisplayValue) && (
          <div className="flex md:hidden items-center justify-between gap-2 pt-1 border-t border-dashed border-[var(--line)]">
            {showFocusButton && focusButton('flex-1 justify-center py-1.5 flex')}
            {ageDisplayValue && ageBadge('py-1.5 rounded-xl flex', 'text-[11px]')}
          </div>
        )}
      </div>

      {showFocusBanner && (
        <div className="mb-3 bg-indigo-50/95 dark:bg-indigo-950/70 border border-indigo-200/90 dark:border-indigo-800/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2 shadow-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-950 dark:text-indigo-200 min-w-0">
            <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 animate-pulse" />
            <span className="truncate">{t.focusModeActiveBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => onToggleFocusMode(false)}
            className="bg-white dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-300 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer shadow-2xs"
          >
            {t.focusModeExitBtn}
          </button>
        </div>
      )}
    </>
  );
};
