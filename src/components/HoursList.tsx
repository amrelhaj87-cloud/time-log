import React, { useState, useEffect, useRef } from 'react';
import { HourEntry, TagCode, SleepSettings } from '../types';
import { HOUR_LABELS, HOUR_PERIODS, SLEEP_ALLOWED_KEYS, STRINGS, HOURS_LIST } from '../constants/config';
import { getCurrentHourKey } from '../utils/dateUtils';
import { TagPicker } from './TagPicker';
import { ChevronDown, ChevronUp, ArrowDown, Moon, Sparkles, X, Check } from 'lucide-react';

interface HoursListProps {
  hoursData: Record<string, HourEntry>;
  onChangeHour: (key: string, text: string, tag: TagCode) => void;
  onCopyDown: (sourceKey: string, targetKey: string) => void;
  sleepSettings: SleepSettings;
  isSleepExceptionToday: boolean;
  onToggleSleepException: () => void;
  sleepHourKeys: string[];
  isToday: boolean;
  googleCalendarEvents?: Record<string, { text: string; tag: TagCode }>;
  onDismissCalendarEvent?: (key: string) => void;
  hasGoldenGoal?: boolean;
  isFocusMode?: boolean;
  lang: 'ar' | 'en';
}

export const HoursList: React.FC<HoursListProps> = ({
  hoursData,
  onChangeHour,
  onCopyDown,
  sleepSettings,
  isSleepExceptionToday,
  onToggleSleepException,
  sleepHourKeys,
  isToday,
  googleCalendarEvents = {},
  onDismissCalendarEvent,
  hasGoldenGoal = false,
  isFocusMode = false,
  lang
}) => {
  const t = STRINGS[lang];

  // Helper to determine the period ID of the current hour
  const getCurrentPeriodId = (): string => {
    const currentHour = getCurrentHourKey();
    for (const p of HOUR_PERIODS) {
      if (p.keys.includes(currentHour)) {
        return p.id;
      }
    }
    return 'morning';
  };

  // State for which periods are collapsed
  const [collapsedPeriods, setCollapsedPeriods] = useState<Record<string, boolean>>(() => {
    // Only on initial render: if has golden goal, collapse other periods
    if (hasGoldenGoal) {
      const activePeriodId = getCurrentPeriodId();
      return {
        morning: activePeriodId !== 'morning',
        noon: activePeriodId !== 'noon',
        evening: activePeriodId !== 'evening',
        night: activePeriodId !== 'night'
      };
    }
    return {
      morning: false,
      noon: false,
      evening: false,
      night: false
    };
  });

  // Track if initial collapse has been executed
  const initialCollapseDoneRef = useRef(false);

  // If focus mode activated, uncollapse the active period
  useEffect(() => {
    if (isFocusMode && isToday) {
      const activePeriodId = getCurrentPeriodId();
      setCollapsedPeriods((prev) => ({
        ...prev,
        [activePeriodId]: false
      }));
    }
  }, [isFocusMode, isToday]);

  useEffect(() => {
    if (initialCollapseDoneRef.current) return;
    if (isToday && hasGoldenGoal) {
      initialCollapseDoneRef.current = true;
      const activePeriodId = getCurrentPeriodId();
      setCollapsedPeriods({
        morning: activePeriodId !== 'morning',
        noon: activePeriodId !== 'noon',
        evening: activePeriodId !== 'evening',
        night: activePeriodId !== 'night'
      });
    }
  }, [isToday, hasGoldenGoal]);

  // Listen for custom trigger to expand period and focus current hour
  useEffect(() => {
    const handleExpandAndFocus = (e: Event) => {
      const customEvt = e as CustomEvent<{ hourKey?: string }>;
      const targetKey = customEvt.detail?.hourKey || getCurrentHourKey();

      // Find period of targetKey and uncollapse it
      for (const p of HOUR_PERIODS) {
        if (p.keys.includes(targetKey)) {
          setCollapsedPeriods((prev) => ({
            ...prev,
            [p.id]: false
          }));
          break;
        }
      }

      // Focus input
      setTimeout(() => {
        const inputEl = document.getElementById(`hour-input-${targetKey}`);
        if (inputEl) {
          inputEl.focus();
          inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    };

    window.addEventListener('expand-and-focus-hour', handleExpandAndFocus);
    return () => window.removeEventListener('expand-and-focus-hour', handleExpandAndFocus);
  }, []);

  const togglePeriod = (periodId: string) => {
    setCollapsedPeriods((prev) => ({
      ...prev,
      [periodId]: !prev[periodId]
    }));
  };

  const showSleepBlock = sleepSettings.enabled && sleepHourKeys.length > 0 && !isSleepExceptionToday;

  // Sleep block time labels
  const startKey = sleepHourKeys[0] || '11pm';
  const endKey = sleepHourKeys[sleepHourKeys.length - 1] || '7am';
  const sleepStartLabel = HOUR_LABELS[lang][startKey] || startKey;
  const sleepEndLabel = HOUR_LABELS[lang][endKey] || endKey;
  const sleepHoursCount = sleepHourKeys.length;

  // Quick fill midnight sleep
  const handleQuickFillNightSleep = () => {
    const nightKeys = ['12am', '1am', '2am', '3am', '4am'];
    nightKeys.forEach((key) => {
      onChangeHour(key, lang === 'ar' ? 'نوم' : 'Sleep', 'SC');
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Sleep Window Collapsed Block */}
      {showSleepBlock && (
        <div
          onClick={isToday ? onToggleSleepException : undefined}
          className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-xs cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-all select-none group min-w-0"
          title={isToday ? t.sleepBlockClickHint : undefined}
        >
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <span className="text-base sm:text-lg shrink-0">🌙</span>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs text-[var(--ink)] truncate">
                {t.sleepBlockLabel}
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-[var(--ink-soft)] truncate">
                {t.sleepBlockDetail(sleepStartLabel, sleepEndLabel, sleepHoursCount)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="bg-[var(--card)] border border-slate-200 dark:border-slate-700 text-[var(--ink)] px-2 py-0.5 rounded-full text-xs font-bold font-mono whitespace-nowrap">
              {sleepHoursCount}h
            </span>

            {isToday && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSleepException();
                }}
                className="bg-[var(--card)] hover:bg-indigo-600 hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-medium text-[var(--ink-soft)] transition-all shadow-xs whitespace-nowrap cursor-pointer"
              >
                {t.sleepExceptionBtn}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4 Periods List */}
      {HOUR_PERIODS.map((period) => {
        // Filter out sleep hours unless exception is active
        const activeKeys = period.keys.filter(
          (k) => !sleepHourKeys.includes(k) || (showSleepBlock && isSleepExceptionToday)
        );

        if (activeKeys.length === 0) return null;

        const isCollapsed = !!collapsedPeriods[period.id];
        const filledCount = activeKeys.filter((k) => {
          const entry = hoursData[k];
          return entry && entry.text && entry.text.trim() !== '';
        }).length;

        const periodName = period.label[lang];
        const isPeriodCompleted = filledCount === activeKeys.length && activeKeys.length > 0;

        return (
          <div
            key={period.id}
            className="border border-slate-200/90 dark:border-slate-700/80 rounded-xl bg-[var(--card)] shadow-xs overflow-hidden transition-all"
          >
            {/* Period Header */}
            <div
              onClick={() => togglePeriod(period.id)}
              className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer select-none transition-colors ${
                isCollapsed
                  ? 'bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-900 dark:text-slate-100'
                  : 'bg-slate-100/90 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-750 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
              }`}
            >
              {/* Period Icon & Title */}
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">{period.icon}</span>
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  {periodName}
                </span>
                {isPeriodCompleted && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded-md">
                    <Check className="w-3 h-3" />
                    <span>{lang === 'ar' ? 'مكتمل' : 'Done'}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Night quick fill button */}
                {period.id === 'night' && !showSleepBlock && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickFillNightSleep();
                    }}
                    className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-[10px] font-semibold px-2 py-0.5 rounded-lg hover:border-indigo-300 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                    title={lang === 'ar' ? 'تعبئة 12-4 ص بنوم + تصنيف SC' : 'Fill 12am-4am with Sleep'}
                  >
                    <Moon className="w-3 h-3 text-[var(--sl-color)]" />
                    <span>{lang === 'ar' ? 'تعبئة نوم' : 'Fill Sleep'}</span>
                  </button>
                )}

                {/* Counter Badge */}
                <span className="text-[11px] font-bold font-mono bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white px-2 py-0.5 rounded-md shadow-2xs">
                  {lang === 'ar' ? `${filledCount} من ${activeKeys.length}` : `${filledCount}/${activeKeys.length}`}
                </span>

                {/* Collapse Chevron */}
                <div className="text-slate-700 dark:text-slate-300 p-0.5">
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </div>
              </div>
            </div>

            {/* Period Body / Rows */}
            {!isCollapsed && (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {activeKeys.map((key) => {
                  const label = HOUR_LABELS[lang][key] || key;
                  const entry = hoursData[key] || { text: '', tag: '' };
                  const nextKey = HOURS_LIST[HOURS_LIST.indexOf(key) + 1];
                  const calEvent = isToday && !entry.text.trim() ? googleCalendarEvents[key] : null;
                  const isCurrentHour = isToday && key === getCurrentHourKey();

                  return (
                    <div
                      key={key}
                      className={`px-3 py-2.5 flex items-center gap-2.5 transition-all group ${
                        isCurrentHour
                          ? isFocusMode
                            ? 'bg-indigo-100/90 dark:bg-indigo-950/70 border-s-4 border-s-indigo-600 dark:border-s-indigo-400 ring-2 ring-indigo-400/40 shadow-sm'
                            : 'bg-indigo-50/90 dark:bg-slate-800 border-s-4 border-s-indigo-600 dark:border-s-indigo-400'
                          : isFocusMode
                          ? 'opacity-85 hover:opacity-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {/* Hour Label with High Contrast & Live Pulse Indicator */}
                      <div className="w-14 shrink-0 select-none flex items-center gap-1.5">
                        {isCurrentHour && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600 dark:bg-indigo-400"></span>
                          </span>
                        )}
                        <span
                          className={`text-xs font-bold font-mono ${
                            isCurrentHour
                              ? 'text-indigo-800 dark:text-indigo-300 font-extrabold'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {label}
                        </span>
                      </div>

                      {/* Input & Calendar Suggestions */}
                      <div className="flex-1 min-w-0 relative flex items-center">
                        <input
                          id={`hour-input-${key}`}
                          type="text"
                          dir={lang === 'ar' ? 'rtl' : 'ltr'}
                          value={entry.text}
                          onChange={(e) => {
                            const val = e.target.value;
                            let newTag = entry.tag;

                            // Smart tag suggestion based on keywords
                            if (val.trim() !== '' && !newTag) {
                              const sleepKeywords = ['نوم', 'نام', 'انام', 'ينوم', 'نمت', 'النوم', 'sleep', 'slept'];
                              if (sleepKeywords.some((kw) => val.toLowerCase().includes(kw))) {
                                newTag = 'SC';
                              }
                            }
                            onChangeHour(key, val, newTag);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const tagBtn = document.getElementById(`tag-picker-btn-hour-${key}`);
                              if (tagBtn) {
                                tagBtn.click();
                              }
                            } else if ((e.key === 'Tab' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') && calEvent && !entry.text.trim()) {
                              // Quick accept calendar ghost text
                              if (e.key === 'Tab') {
                                e.preventDefault();
                                onChangeHour(key, calEvent.text, calEvent.tag || 'E');
                              }
                            }
                          }}
                          placeholder={!calEvent ? t.hourPlaceholder : ''}
                          className="w-full text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent focus:border-indigo-500 outline-hidden py-1 px-1 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-400 relative z-10"
                        />

                        {/* Ghost Calendar Suggestion Pill */}
                        {calEvent && !entry.text && (
                          <div
                            onClick={() => {
                              onChangeHour(key, calEvent.text, calEvent.tag || 'E');
                              const inputEl = document.getElementById(`hour-input-${key}`);
                              inputEl?.focus();
                            }}
                            className="absolute inset-0 z-0 flex items-center justify-between px-1 pointer-events-auto cursor-pointer group/ghost"
                            title={lang === 'ar' ? `موعد من Google Calendar: "${calEvent.text}" (انقر لتنزيله بالساعة)` : `Google Calendar Event: "${calEvent.text}" (Click to apply)`}
                          >
                            <span className="text-xs text-indigo-600/80 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/60 border border-dashed border-indigo-300 dark:border-indigo-700/80 px-2 py-0.5 rounded-md truncate max-w-[85%] select-none flex items-center gap-1.5 transition-colors group-hover/ghost:border-indigo-500">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0 inline" />
                              <span className="font-medium">{calEvent.text}</span>
                              <span className="text-[10px] opacity-70 font-sans hidden sm:inline">({lang === 'ar' ? 'انقر للتنزيل' : 'click to apply'})</span>
                            </span>

                            {onDismissCalendarEvent && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDismissCalendarEvent(key);
                                }}
                                className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors opacity-60 hover:opacity-100 shrink-0"
                                title={lang === 'ar' ? 'إخفاء هذا الاقتراح' : 'Dismiss suggestion'}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Tag Picker */}
                      <TagPicker
                        buttonId={`tag-picker-btn-hour-${key}`}
                        currentTag={entry.tag}
                        onSelect={(tag) => {
                          let newText = entry.text;
                          if (tag === 'SL' && !newText.trim()) {
                            newText = lang === 'ar' ? 'نوم طبيعي' : 'Natural sleep';
                          }
                          onChangeHour(key, newText, tag);
                        }}
                        disabledCodes={SLEEP_ALLOWED_KEYS.includes(key) ? [] : ['SL']}
                        hideSleepTag={sleepSettings.enabled}
                        lang={lang}
                      />

                      {/* Copy Down Button (Duplicate to next hour) */}
                      {nextKey && (
                        <button
                          type="button"
                          onClick={() => onCopyDown(key, nextKey)}
                          title={t.copyNextTooltip}
                          className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 px-1.5 py-1 rounded-md opacity-40 group-hover:opacity-100 hover:bg-indigo-50 dark:hover:bg-slate-700/80 border border-transparent hover:border-indigo-200 dark:hover:border-slate-600 transition-all shrink-0 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
