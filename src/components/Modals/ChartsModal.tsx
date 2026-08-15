import React, { useState, useMemo } from 'react';
import { TagCode, WeekData, DayData } from '../../types';
import { TAGS_CONFIG, STRINGS, DAY_ABBR_EN, MONTH_NAMES, DAY_NAMES } from '../../constants/config';
import { addDays, isoDate } from '../../utils/dateUtils';
import {
  X,
  BarChart3,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle2,
  PieChart,
  CalendarDays,
  Sparkles
} from 'lucide-react';

interface ChartsModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekStart: Date;
  weekData: WeekData;
  activeHoursKeys: string[];
  hideSleepTag?: boolean;
  lang: 'ar' | 'en';
}

export const ChartsModal: React.FC<ChartsModalProps> = ({
  isOpen,
  onClose,
  weekStart,
  weekData,
  activeHoursKeys,
  hideSleepTag = false,
  lang
}) => {
  const [activeTab, setActiveTab] = useState<'week' | 'month'>('week');
  const t = STRINGS[lang];

  // 1. Calculate Weekly Totals & Breakdown
  const weekStats = useMemo(() => {
    const weeklyTagTotals: Record<TagCode, number> = { E: 0, V: 0, R: 0, S: 0, SC: 0, SL: 0, '': 0 };
    let totalWeeklyLogged = 0;
    let activeDaysCount = 0;
    const dailyBreakdown: Array<{
      dateStr: string;
      dayAbbr: string;
      dayName: string;
      dayNum: number;
      loggedCount: number;
      pct: number;
    }> = [];

    const activeCapacityPerDay = activeHoursKeys.length;
    const totalWeeklyCapacity = activeCapacityPerDay * 7;

    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const ds = isoDate(d);
      const day = weekData.days[ds];

      let dayLogged = 0;
      if (day && day.hours) {
        activeHoursKeys.forEach((k) => {
          const hour = day.hours[k];
          if (hour && hour.text && hour.text.trim() !== '') {
            totalWeeklyLogged++;
            dayLogged++;
            if (hour.tag) {
              weeklyTagTotals[hour.tag] = (weeklyTagTotals[hour.tag] || 0) + 1;
            }
          }
        });
      }

      if (dayLogged > 0) activeDaysCount++;

      const pct = activeCapacityPerDay > 0 ? Math.round((dayLogged / activeCapacityPerDay) * 100) : 0;
      dailyBreakdown.push({
        dateStr: ds,
        dayAbbr: DAY_ABBR_EN[d.getDay()],
        dayName: DAY_NAMES[lang][d.getDay()],
        dayNum: d.getDate(),
        loggedCount: dayLogged,
        pct
      });
    }

    const avgPerDay = (totalWeeklyLogged / 7).toFixed(1);
    const avgPerActiveDay = activeDaysCount > 0 ? (totalWeeklyLogged / activeDaysCount).toFixed(1) : '0';
    const completionPct = totalWeeklyCapacity > 0 ? Math.round((totalWeeklyLogged / totalWeeklyCapacity) * 100) : 0;
    const unloggedHours = Math.max(0, totalWeeklyCapacity - totalWeeklyLogged);

    return {
      weeklyTagTotals,
      totalWeeklyLogged,
      totalWeeklyCapacity,
      activeDaysCount,
      dailyBreakdown,
      avgPerDay,
      avgPerActiveDay,
      completionPct,
      unloggedHours
    };
  }, [weekStart, weekData, activeHoursKeys, lang]);

  // 2. Scan and aggregate Month Data from localStorage & current weekData
  const monthStats = useMemo(() => {
    const targetMonth = weekStart.getMonth();
    const targetYear = weekStart.getFullYear();
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const monthTagTotals: Record<TagCode, number> = { E: 0, V: 0, R: 0, S: 0, SC: 0, SL: 0, '': 0 };

    let totalMonthLogged = 0;
    let monthDaysLoggedCount = 0;
    const dailyMonthData: Record<string, number> = {};

    // Collect all days from localStorage
    const allStorageKeys = Object.keys(localStorage);
    const weekDataMaps: WeekData[] = [];

    // Add current in-memory weekData first
    weekDataMaps.push(weekData);

    allStorageKeys.forEach((key) => {
      if (key.startsWith('time_log_week_')) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '{}');
          if (parsed && parsed.days) {
            weekDataMaps.push(parsed);
          }
        } catch {}
      }
    });

    // Merge day data uniquely
    const mergedDays: Record<string, DayData> = {};
    weekDataMaps.forEach((wd) => {
      if (wd && wd.days) {
        Object.entries(wd.days).forEach(([ds, dData]) => {
          if (!mergedDays[ds]) {
            mergedDays[ds] = dData;
          }
        });
      }
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(targetYear, targetMonth, day);
      const ds = isoDate(d);
      const dayData = mergedDays[ds];

      let dayCount = 0;
      if (dayData && dayData.hours) {
        activeHoursKeys.forEach((k) => {
          const hour = dayData.hours[k];
          if (hour && hour.text && hour.text.trim() !== '') {
            totalMonthLogged++;
            dayCount++;
            if (hour.tag) {
              monthTagTotals[hour.tag] = (monthTagTotals[hour.tag] || 0) + 1;
            }
          }
        });
      }

      if (dayCount > 0) {
        monthDaysLoggedCount++;
        dailyMonthData[ds] = dayCount;
      }
    }

    const monthCapacity = activeHoursKeys.length * daysInMonth;
    const monthCompletionPct = monthCapacity > 0 ? Math.round((totalMonthLogged / monthCapacity) * 100) : 0;
    const avgPerDayInMonth = monthDaysLoggedCount > 0 ? (totalMonthLogged / monthDaysLoggedCount).toFixed(1) : '0';

    return {
      targetMonth,
      targetYear,
      daysInMonth,
      monthTagTotals,
      totalMonthLogged,
      monthCapacity,
      monthDaysLoggedCount,
      monthCompletionPct,
      avgPerDayInMonth,
      dailyMonthData
    };
  }, [weekStart, weekData, activeHoursKeys]);

  if (!isOpen) return null;

  const allCodes: TagCode[] = ['E', 'V', 'R', 'S', 'SC', 'SL'];
  const weekCodes = allCodes.filter((c) => !hideSleepTag || c !== 'SL' || weekStats.weeklyTagTotals.SL > 0);
  const monthCodes = allCodes.filter((c) => !hideSleepTag || c !== 'SL' || monthStats.monthTagTotals.SL > 0);

  const activeHoursCapacity = activeHoursKeys.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col gap-4 relative animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div className="flex items-center gap-2.5 font-bold text-lg text-[var(--ink)]">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span>{t.chartsModalTitle}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--ink-soft)] hover:text-rose-500 p-1.5 rounded-lg transition-all cursor-pointer hover:bg-[var(--bg)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--bg)] rounded-xl border border-[var(--line)]">
          <button
            type="button"
            onClick={() => setActiveTab('week')}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'week'
                ? 'bg-[var(--card)] text-indigo-600 dark:text-indigo-400 border border-[var(--line)] shadow-xs'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>{t.statsTabWeekBtn}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('month')}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'month'
                ? 'bg-[var(--card)] text-indigo-600 dark:text-indigo-400 border border-[var(--line)] shadow-xs'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>{t.statsTabMonthBtn}</span>
          </button>
        </div>

        {/* 1. WEEKLY STATS CONTENT */}
        {activeTab === 'week' && (
          <div className="flex flex-col gap-5 py-1">
            
            {/* Top 4 Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Total Logged */}
              <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3 flex flex-col justify-between shadow-2xs">
                <span className="text-[11px] font-bold text-[var(--ink-soft)]">
                  {lang === 'ar' ? 'ساعات الإنجاز' : 'Logged Hours'}
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
                    {weekStats.totalWeeklyLogged}h
                  </span>
                  <span className="text-[11px] text-[var(--ink-faint)] font-mono">
                    /{weekStats.totalWeeklyCapacity}h
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-md w-fit">
                  <span>{weekStats.completionPct}%</span>
                  <span>{lang === 'ar' ? 'إنجاز الأسبوع' : 'weekly rate'}</span>
                </div>
              </div>

              {/* Daily Average */}
              <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3 flex flex-col justify-between shadow-2xs">
                <span className="text-[11px] font-bold text-[var(--ink-soft)]">
                  {lang === 'ar' ? 'المعدل اليومي' : 'Daily Avg'}
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
                    {weekStats.avgPerDay}h
                  </span>
                  <span className="text-[11px] text-[var(--ink-faint)] font-mono">
                    /{activeHoursCapacity}h
                  </span>
                </div>
                <span className="text-[10px] text-[var(--ink-soft)] mt-1.5">
                  {lang === 'ar' ? 'لكل يوم بالأسبوع' : 'per active day'}
                </span>
              </div>

              {/* Active Days */}
              <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3 flex flex-col justify-between shadow-2xs">
                <span className="text-[11px] font-bold text-[var(--ink-soft)]">
                  {lang === 'ar' ? 'أيام التدوين' : 'Active Days'}
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                    {weekStats.activeDaysCount}
                  </span>
                  <span className="text-[11px] text-[var(--ink-faint)] font-mono">/ 7</span>
                </div>
                <span className="text-[10px] text-[var(--ink-soft)] mt-1.5">
                  {lang === 'ar' ? 'أيام تم تسجيلها' : 'recorded days'}
                </span>
              </div>

              {/* Unlogged / Free Hours */}
              <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3 flex flex-col justify-between shadow-2xs">
                <span className="text-[11px] font-bold text-[var(--ink-soft)]">
                  {lang === 'ar' ? 'ساعات حرة / فارغة' : 'Unlogged Hours'}
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-extrabold font-mono text-slate-600 dark:text-slate-400">
                    {weekStats.unloggedHours}h
                  </span>
                </div>
                <span className="text-[10px] text-[var(--ink-soft)] mt-1.5">
                  {lang === 'ar' ? 'من الساعات المتاحة' : 'of active capacity'}
                </span>
              </div>
            </div>

            {/* Daily Breakdown Bars (7 Days) */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-[var(--ink)] flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{lang === 'ar' ? 'نشاط أيام الأسبوع (من الساعات النشطة)' : 'Daily Breakdown of Active Hours'}</span>
                </h4>
                <span className="text-[11px] text-[var(--ink-soft)] font-mono">
                  {activeHoursCapacity} {lang === 'ar' ? 'ساعة متاحة يومياً' : 'h / day'}
                </span>
              </div>

              <div className="grid grid-cols-7 gap-2 pt-2 border-t border-[var(--line)]">
                {weekStats.dailyBreakdown.map((item) => (
                  <div key={item.dateStr} className="flex flex-col items-center gap-1.5 text-center">
                    <span className="text-[11px] font-bold text-[var(--ink)]">{item.dayAbbr}</span>
                    <span className="text-[10px] text-[var(--ink-soft)] font-mono">{item.dayNum}</span>
                    
                    {/* Vertical Progress Bar Container */}
                    <div className="w-full bg-[var(--card)] border border-[var(--line)] h-20 rounded-lg p-1 flex flex-col justify-end overflow-hidden relative">
                      <div
                        className="w-full rounded-md transition-all duration-300 bg-indigo-600 dark:bg-indigo-500"
                        style={{ height: `${item.pct}%` }}
                      />
                    </div>

                    <span className="text-[10px] font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      {item.loggedCount}h
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Progress Bars */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
              <h4 className="font-bold text-xs text-[var(--ink)] flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{lang === 'ar' ? 'توزيع تصنيفات الأسبوع' : 'Weekly Tag Distribution'}</span>
              </h4>

              <div className="flex flex-col gap-2.5 pt-2 border-t border-[var(--line)]">
                {weekCodes.map((code) => {
                  const info = TAGS_CONFIG[code];
                  const count = weekStats.weeklyTagTotals[code] || 0;
                  const pctOfLogged = weekStats.totalWeeklyLogged > 0 ? Math.round((count / weekStats.totalWeeklyLogged) * 100) : 0;
                  const pctOfCapacity = weekStats.totalWeeklyCapacity > 0 ? Math.round((count / weekStats.totalWeeklyCapacity) * 100) : 0;

                  return (
                    <div key={code} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: info.color }}
                          />
                          <span className="text-[var(--ink)]">{info.fullTitle[lang]}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span style={{ color: info.color }}>{count}h</span>
                          <span className="text-[var(--ink-soft)] font-normal">({pctOfLogged}% {lang === 'ar' ? 'من المسجل' : 'of logged'})</span>
                        </div>
                      </div>

                      <div className="w-full h-2.5 bg-[var(--card)] border border-[var(--line)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${pctOfLogged}%`,
                            backgroundColor: info.color
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* 2. MONTHLY STATS CONTENT */}
        {activeTab === 'month' && (
          <div className="flex flex-col gap-5 py-1">
            
            {/* Month Header Banner */}
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[var(--ink)]">
                    {MONTH_NAMES[lang][monthStats.targetMonth]} {monthStats.targetYear}
                  </h4>
                  <p className="text-xs text-[var(--ink-soft)] mt-0.5">
                    {lang === 'ar'
                      ? `إحصائيات شهرية مجمعة لـ ${monthStats.daysInMonth} يوماً`
                      : `Aggregated monthly data for ${monthStats.daysInMonth} days`}
                  </p>
                </div>
              </div>

              <div className="text-end">
                <span className="text-lg font-extrabold font-mono text-indigo-600 dark:text-indigo-400 block">
                  {monthStats.totalMonthLogged}h
                </span>
                <span className="text-[10px] text-[var(--ink-soft)]">
                  {lang === 'ar' ? 'إجمالي الساعات المسجلة' : 'Total Logged'}
                </span>
              </div>
            </div>

            {/* Monthly Key Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex flex-col justify-between shadow-2xs">
                <span className="text-[11px] font-bold text-[var(--ink-soft)]">
                  {lang === 'ar' ? 'الأيام النشطة في الشهر' : 'Active Days in Month'}
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                    {monthStats.monthDaysLoggedCount}
                  </span>
                  <span className="text-[11px] text-[var(--ink-faint)] font-mono">
                    /{monthStats.daysInMonth} {lang === 'ar' ? 'يوم' : 'days'}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--ink-soft)] mt-1">
                  {lang === 'ar' ? 'أيام تم تدوين أنشطة بها' : 'days with logged activities'}
                </span>
              </div>

              <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex flex-col justify-between shadow-2xs">
                <span className="text-[11px] font-bold text-[var(--ink-soft)]">
                  {lang === 'ar' ? 'المعدل اليومي للأيام المسجلة' : 'Daily Average (Active Days)'}
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
                    {monthStats.avgPerDayInMonth}h
                  </span>
                  <span className="text-[11px] text-[var(--ink-faint)] font-mono">
                    /{activeHoursCapacity}h
                  </span>
                </div>
                <span className="text-[10px] text-[var(--ink-soft)] mt-1">
                  {lang === 'ar' ? 'متوسط ساعات الإنجاز' : 'avg productive hours'}
                </span>
              </div>

              <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex flex-col justify-between shadow-2xs">
                <span className="text-[11px] font-bold text-[var(--ink-soft)]">
                  {lang === 'ar' ? 'نسبة الاستغلال الكلية' : 'Monthly Utilization'}
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
                    {monthStats.monthCompletionPct}%
                  </span>
                  <span className="text-[11px] text-[var(--ink-faint)] font-mono">
                    ({monthStats.totalMonthLogged}/{monthStats.monthCapacity}h)
                  </span>
                </div>
                <span className="text-[10px] text-[var(--ink-soft)] mt-1">
                  {lang === 'ar' ? 'من إجمالي الساعات النشطة' : 'of active capacity'}
                </span>
              </div>
            </div>

            {/* Monthly Category Distribution */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-4 flex flex-col gap-3 shadow-2xs">
              <h4 className="font-bold text-xs text-[var(--ink)] flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{lang === 'ar' ? 'توزيع تصنيفات الشهر التراكمية' : 'Monthly Cumulative Tag Breakdown'}</span>
              </h4>

              <div className="flex flex-col gap-2.5 pt-2 border-t border-[var(--line)]">
                {monthCodes.map((code) => {
                  const info = TAGS_CONFIG[code];
                  const count = monthStats.monthTagTotals[code] || 0;
                  const pct = monthStats.totalMonthLogged > 0 ? Math.round((count / monthStats.totalMonthLogged) * 100) : 0;

                  return (
                    <div key={code} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: info.color }}
                          />
                          <span className="text-[var(--ink)]">{info.fullTitle[lang]}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span style={{ color: info.color }}>{count}h</span>
                          <span className="text-[var(--ink-soft)] font-normal">({pct}%)</span>
                        </div>
                      </div>

                      <div className="w-full h-2.5 bg-[var(--card)] border border-[var(--line)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: info.color
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* Footer Close */}
        <div className="border-t border-[var(--line)] pt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[var(--bg)] hover:bg-[var(--line)] border border-[var(--line)] font-semibold text-xs text-[var(--ink)] cursor-pointer transition-all"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
