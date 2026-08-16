import React from 'react';
import { WeekData } from '../types';
import { DAY_ABBR_EN, STRINGS } from '../constants/config';
import { addDays, isoDate } from '../utils/dateUtils';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface WeekNavigatorProps {
  weekStart: Date;
  currentDate: Date;
  weekData: WeekData;
  onSelectDate: (d: Date) => void;
  onOffsetWeek: (offset: number) => void;
  onResetToday: () => void;
  activeHoursKeys: string[];
  lang: 'ar' | 'en';
}

export const WeekNavigator: React.FC<WeekNavigatorProps> = ({
  weekStart,
  currentDate,
  weekData,
  onSelectDate,
  onOffsetWeek,
  onResetToday,
  activeHoursKeys,
  lang
}) => {
  const t = STRINGS[lang];
  const todayStr = isoDate(new Date());
  const selectedDateStr = isoDate(currentDate);

  const daysList = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    const ds = isoDate(d);
    const dayData = weekData.days[ds];

    let filledCount = 0;
    if (dayData && dayData.hours) {
      filledCount = activeHoursKeys.filter((k) => {
        const hour = dayData.hours[k];
        return hour && hour.text && hour.text.trim() !== '';
      }).length;
    }

    const total = activeHoursKeys.length || 1;
    const pct = Math.min(100, Math.round((filledCount / total) * 100));

    daysList.push({
      date: d,
      dateStr: ds,
      dayNum: d.getDate(),
      dayAbbr: DAY_ABBR_EN[d.getDay()],
      pct,
      isToday: ds === todayStr,
      isSelected: ds === selectedDateStr
    });
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--line)] rounded-xl p-3 shadow-xs flex flex-col justify-between gap-2.5">
      <div className="flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={() => onOffsetWeek(lang === 'ar' ? 1 : -1)}
          className="p-1.5 rounded-lg border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-all flex items-center justify-center font-medium cursor-pointer"
          title={lang === 'ar' ? 'الأسبوع القادم' : 'Previous Week'}
        >
          {lang === 'ar' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onResetToday}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{t.today}</span>
        </button>

        <button
          type="button"
          onClick={() => onOffsetWeek(lang === 'ar' ? -1 : 1)}
          className="p-1.5 rounded-lg border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-all flex items-center justify-center font-medium cursor-pointer"
          title={lang === 'ar' ? 'الأسبوع السابق' : 'Next Week'}
        >
          {lang === 'ar' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* 7 Day Strip */}
      <div className="grid grid-cols-7 gap-1.5">
        {(lang === 'ar' ? [...daysList].reverse() : daysList).map((day) => (
          <button
            key={day.dateStr}
            type="button"
            onClick={() => onSelectDate(day.date)}
            className={`py-1.5 px-1 rounded-lg text-center flex flex-col items-center justify-center transition-all border cursor-pointer ${
              day.isSelected
                ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs'
                : 'border-[var(--line)] bg-[var(--card)] hover:border-slate-300 dark:hover:border-slate-600 hover:bg-[var(--bg)] text-[var(--ink)]'
            }`}
            style={{
              borderColor: day.isToday && !day.isSelected ? 'var(--amber)' : undefined
            }}
          >
            <span
              className={`text-[10px] font-semibold tracking-tight ${
                day.isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--ink-soft)]'
              }`}
            >
              {day.dayAbbr}
            </span>
            <span className="text-sm font-bold font-mono leading-tight my-0.5">
              {day.dayNum}
            </span>
            {/* Progress bar */}
            <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-0.5">
              <div
                className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-300 rounded-full"
                style={{ width: `${day.pct}%` }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
