import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { WeekStartDay, ThemeMode, AgeDisplayOpt } from '../types';
import { STRINGS, DAY_NAMES, MONTH_NAMES, DAY_ABBR_EN } from '../constants/config';
import { isoDate, focusCurrentHourInput } from '../utils/dateUtils';
import {
  Calendar,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  SlidersHorizontal,
  Cake,
  Settings,
  RotateCcw,
  WifiOff,
  Inbox
} from 'lucide-react';
import { subscribeOnlineStatus } from '../services/pwaService';

interface HeaderProps {
  currentDate: Date;
  onSelectDate: (d: Date) => void;
  loggedCount: number;
  totalActiveHours: number;
  onOpenDayDist: () => void;
  userBirthDate: string;
  ageDisplayOpt: AgeDisplayOpt;
  streak?: number;
  streakHasToday?: boolean;
  showStreak?: boolean;
  weekStartDay?: WeekStartDay;
  isDetailedView: boolean;
  onToggleDetailedView: () => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  themeMode?: ThemeMode;
  isDarkEffective?: boolean;
  onCycleThemeMode?: () => void;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
  saveStatus: string;
  onOpenTodoInbox?: () => void;
  todoCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  onSelectDate,
  loggedCount,
  totalActiveHours,
  onOpenDayDist,
  userBirthDate,
  ageDisplayOpt,
  streak = 0,
  streakHasToday = false,
  showStreak = true,
  weekStartDay = 'saturday',
  isDetailedView,
  onToggleDetailedView,
  currentUser,
  onOpenAuth,
  onSignOut,
  onOpenSettings,
  darkMode,
  onToggleDarkMode,
  themeMode = 'light',
  isDarkEffective = false,
  onCycleThemeMode,
  lang,
  onToggleLang,
  saveStatus,
  onOpenTodoInbox,
  todoCount
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date(currentDate));
  const [liveTime, setLiveTime] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Subscribe to Online/Offline network state
  useEffect(() => {
    const unsub = subscribeOnlineStatus((online) => {
      setIsOnline(online);
    });
    return () => unsub();
  }, []);

  // Sync calendar view when currentDate changes
  useEffect(() => {
    setCalendarViewDate(new Date(currentDate));
  }, [currentDate]);

  // Live Clock updater
  useEffect(() => {
    const update = () => {
      const now = new Date();
      let h = now.getHours();
      const m = String(now.getMinutes()).padStart(2, '0');
      let ampm = '';
      if (lang === 'ar') {
        ampm = h >= 12 ? 'م' : 'ص';
        h = h % 12;
        if (h === 0) h = 12;
        setLiveTime(`${String(h).padStart(2, '0')}:${m} ${ampm}`);
      } else {
        ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
        setLiveTime(`${String(h).padStart(2, '0')}:${m} ${ampm}`);
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [lang]);

  // Click outside menu & datepicker
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setDatePickerOpen(false);
      }
    };
    if (menuOpen || datePickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen, datePickerOpen]);

  // Format current date label (Full day name + Month name)
  const dayName = DAY_NAMES[lang][currentDate.getDay()];
  const monthName = MONTH_NAMES[lang][currentDate.getMonth()];
  const dNum = currentDate.getDate();
  const yNum = currentDate.getFullYear();
  const dateStr =
    lang === 'ar'
      ? `${dayName}، ${dNum} ${monthName}`
      : `${dayName}, ${monthName} ${dNum}`;
  const dateStrFull =
    lang === 'ar'
      ? `${dayName}، ${dNum} ${monthName} ${yNum}`
      : `${dayName}, ${monthName} ${dNum}, ${yNum}`;

  // Calendar Helper functions based on weekStartDay
  const calYear = calendarViewDate.getFullYear();
  const calMonth = calendarViewDate.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const rawFirstDayIndex = new Date(calYear, calMonth, 1).getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Calculate weekday shift: saturday=6, sunday=0, monday=1
  const startDayIdx = weekStartDay === 'sunday' ? 0 : weekStartDay === 'monday' ? 1 : 6;
  const prevMonthOffset = (rawFirstDayIndex - startDayIdx + 7) % 7;
  const prevMonthDays = new Date(calYear, calMonth, 0).getDate();

  // Ordered weekday names in English abbreviation for both Arabic & English
  const orderedDayNames = React.useMemo(() => {
    const names = DAY_ABBR_EN;
    const reordered: string[] = [];
    for (let i = 0; i < 7; i++) {
      reordered.push(names[(startDayIdx + i) % 7]);
    }
    return reordered;
  }, [startDayIdx]);

  const handlePrevMonth = () => {
    setCalendarViewDate(new Date(calYear, calMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarViewDate(new Date(calYear, calMonth + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const targetDate = new Date(calYear, calMonth, day, 0, 0, 0);
    onSelectDate(targetDate);
    setDatePickerOpen(false);
  };

  const handleQuickJump = (offsetDays: number) => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays, 0, 0, 0);
    onSelectDate(target);
    setCalendarViewDate(new Date(target));
    setDatePickerOpen(false);
    if (offsetDays === 0) {
      focusCurrentHourInput();
    }
  };

  const isSameDay = (d1: Date, y: number, m: number, d: number) => {
    return d1.getFullYear() === y && d1.getMonth() === m && d1.getDate() === d;
  };

  const today = new Date();

  // Age calculation
  let ageDisplayValue = '';
  let ageUnit = '';
  if (userBirthDate && (ageDisplayOpt === 'days' || ageDisplayOpt === 'years')) {
    const birth = new Date(userBirthDate + 'T00:00:00');
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

  // Mini progress ring
  const pct = totalActiveHours > 0 ? Math.min(1, loggedCount / totalActiveHours) : 0;
  const mr = 13, mcx = 16, mcy = 16, mcirc = 2 * Math.PI * mr;
  const strokeOffset = mcirc * (1 - pct);

  const t = STRINGS[lang];

  return (
    <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 md:gap-3 pb-3 mb-4 border-b border-[var(--line)] w-full min-w-0 select-none">
      {/* Top Row on Mobile / Left & Middle on Desktop */}
      <div className="flex items-center justify-between gap-2 w-full md:w-auto min-w-0">
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-xl flex items-center justify-center shadow-xs select-none shrink-0 ring-1 ring-indigo-700/20 dark:ring-indigo-400/30">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 text-white drop-shadow-xs"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Prominent, bold white clock circle */}
              <circle cx="12" cy="12" r="8.5" stroke="white" strokeWidth="2.5" />
              {/* Bold white clock hands */}
              <polyline points="12 7.5 12 12 15.5 14" stroke="white" strokeWidth="2.5" />
            </svg>
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base md:text-lg text-[var(--ink)] tracking-tight leading-tight whitespace-nowrap">
                {t.brand}
              </h1>
              <span className="font-mono font-bold text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                v3.8
              </span>
            </div>
            <span className="text-[10px] font-semibold text-[var(--ink-soft)] tracking-wider hidden sm:inline mt-0.5 whitespace-nowrap">
              {lang === 'ar' ? 'نظام تسجيل الوقت الذكي' : 'Productivity Tracker'}
            </span>
          </div>
        </div>

        {/* Action Controls on Mobile Top Row */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          {/* Detailed vs Compact View Toggle */}
          <button
            type="button"
            onClick={onToggleDetailedView}
            className={`border rounded-lg p-2 transition-all shadow-xs cursor-pointer ${
              isDetailedView
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 font-bold ring-1 ring-indigo-500/20'
                : 'bg-[var(--card)] border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)]'
            }`}
            title={isDetailedView ? (lang === 'ar' ? 'عرض مدمج (إخفاء شريط الأسبوع)' : 'Compact View') : (lang === 'ar' ? 'عرض تفصيلي (إظهار شريط الأسبوع)' : 'Detailed View')}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="bg-[var(--card)] border border-[var(--line)] rounded-lg p-2 text-[var(--ink)] hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-[var(--bg)] transition-all shadow-xs cursor-pointer"
            title={lang === 'ar' ? 'الإعدادات والتفضيلات' : 'Settings & Preferences'}
          >
            <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </button>

          {/* User Auth on Mobile */}
          {currentUser ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-1.5 transition-all shadow-xs cursor-pointer flex items-center gap-1"
              >
                <img
                  src={
                    currentUser.photoURL ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      currentUser.displayName || currentUser.email || 'User'
                    )}&background=4F46E5&color=ffffff`
                  }
                  alt="Avatar"
                  className="w-5 h-5 rounded-full object-cover shrink-0"
                />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1 transition-all shadow-xs cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span>{t.loginBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 2 on Mobile (Date Selector + Age + Live Clock + Progress) / Left & Middle on Desktop */}
      <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 w-full md:w-auto min-w-0 flex-wrap sm:flex-nowrap">

        {/* Date Selector Popover */}
        <div className="relative shrink-0" ref={datePickerRef}>
          <button
            type="button"
            onClick={() => setDatePickerOpen(!datePickerOpen)}
            className={`bg-[var(--card)] border ${
              datePickerOpen ? 'border-indigo-600 dark:border-indigo-400 ring-2 ring-indigo-500/20' : 'border-[var(--line)]'
            } hover:border-indigo-400 dark:hover:border-indigo-500 text-[var(--ink)] px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all select-none hover:bg-[var(--bg)]`}
            title={lang === 'ar' ? `${dateStrFull} (انقر لفتح التقويم)` : `${dateStrFull} (Click to select date)`}
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="font-medium text-[var(--ink)] whitespace-nowrap">{dateStr}</span>
            <ChevronDown className={`w-3 h-3 text-[var(--ink-faint)] shrink-0 transition-transform ${datePickerOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Custom Calendar Dropdown */}
          {datePickerOpen && (
            <div
              className={`absolute top-full mt-2 z-50 bg-[var(--card)] border border-[var(--line)] rounded-2xl p-3 shadow-2xl w-[290px] flex flex-col gap-2.5 text-xs animate-in fade-in zoom-in-95 duration-100 ${
                lang === 'ar' ? 'right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2' : 'left-0 sm:left-auto sm:right-1/2 sm:translate-x-1/2'
              }`}
            >
              {/* Calendar Month Header */}
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-2 px-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg)] text-[var(--ink-soft)] hover:text-[var(--ink)] transition-all cursor-pointer"
                  title={lang === 'ar' ? 'الشهر السابق' : 'Previous Month'}
                >
                  {lang === 'ar' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>

                <div className="font-bold text-sm text-[var(--ink)] flex items-center gap-1">
                  <span>{MONTH_NAMES[lang][calMonth]}</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono">{calYear}</span>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg)] text-[var(--ink-soft)] hover:text-[var(--ink)] transition-all cursor-pointer"
                  title={lang === 'ar' ? 'الشهر التالي' : 'Next Month'}
                >
                  {lang === 'ar' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>

              {/* Weekday Names (Short English for clean layout in both Arabic & English) */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] font-mono text-[var(--ink-soft)] select-none">
                {orderedDayNames.map((dn) => (
                  <div key={dn} className="py-0.5 tracking-tight">
                    {dn}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Previous month padding days */}
                {Array.from({ length: prevMonthOffset }, (_, i) => {
                  const dayNum = prevMonthDays - prevMonthOffset + i + 1;
                  return (
                    <button
                      key={`prev-${i}`}
                      type="button"
                      onClick={() => {
                        const target = new Date(calYear, calMonth - 1, dayNum, 0, 0, 0);
                        onSelectDate(target);
                        setDatePickerOpen(false);
                      }}
                      className="py-1.5 rounded-lg text-[11px] text-[var(--ink-faint)] opacity-40 hover:opacity-100 hover:bg-[var(--bg)] transition-all cursor-pointer font-mono"
                    >
                      {dayNum}
                    </button>
                  );
                })}

                {/* Current month days */}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const dayNum = i + 1;
                  const isSelected = isSameDay(currentDate, calYear, calMonth, dayNum);
                  const isRealToday = isSameDay(today, calYear, calMonth, dayNum);

                  return (
                    <button
                      key={`curr-${dayNum}`}
                      type="button"
                      onClick={() => handleSelectDay(dayNum)}
                      className={`py-1.5 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : isRealToday
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800'
                          : 'text-[var(--ink)] hover:bg-[var(--bg)] hover:text-indigo-600'
                      }`}
                    >
                      {dayNum}
                      {isRealToday && !isSelected && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                      )}
                    </button>
                  );
                })}

                {/* Next month padding days to complete grid rows */}
                {Array.from({ length: (7 - ((prevMonthOffset + daysInMonth) % 7)) % 7 }, (_, i) => {
                  const dayNum = i + 1;
                  return (
                    <button
                      key={`next-${i}`}
                      type="button"
                      onClick={() => {
                        const target = new Date(calYear, calMonth + 1, dayNum, 0, 0, 0);
                        onSelectDate(target);
                        setDatePickerOpen(false);
                      }}
                      className="py-1.5 rounded-lg text-[11px] text-[var(--ink-faint)] opacity-40 hover:opacity-100 hover:bg-[var(--bg)] transition-all cursor-pointer font-mono"
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>

              {/* Quick Jump Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[var(--line)] gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleQuickJump(-1)}
                  className="px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--bg)] hover:border-indigo-400 text-[var(--ink-soft)] hover:text-[var(--ink)] font-medium cursor-pointer transition-all flex-1 text-center"
                >
                  {lang === 'ar' ? 'أمس' : 'Yesterday'}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickJump(0)}
                  className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer transition-all flex-1 text-center flex items-center justify-center gap-1 shadow-xs"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{lang === 'ar' ? 'اليوم' : 'Today'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickJump(1)}
                  className="px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--bg)] hover:border-indigo-400 text-[var(--ink-soft)] hover:text-[var(--ink)] font-medium cursor-pointer transition-all flex-1 text-center"
                >
                  {lang === 'ar' ? 'غداً' : 'Tomorrow'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Real-time Clock on Mobile */}
        <div
          className="flex md:hidden bg-indigo-50/90 dark:bg-indigo-950/50 border border-indigo-200/90 dark:border-indigo-800/70 text-indigo-700 dark:text-indigo-300 px-2 py-1.5 rounded-lg text-xs font-mono font-bold shadow-xs items-center gap-1 select-none shrink-0"
          title={lang === 'ar' ? 'الوقت الحالي المباشر' : 'Current Live Time'}
        >
          <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="tracking-tight whitespace-nowrap text-[11px]">{liveTime}</span>
        </div>

        {/* Brain Dump / Inbox Button on Mobile */}
        {onOpenTodoInbox && (
          <button
            type="button"
            onClick={onOpenTodoInbox}
            title={lang === 'ar' ? 'صندوق الأفكار والمهام' : 'Brain Dump & Inbox'}
            className="flex md:hidden bg-[var(--card)] border border-[var(--line)] rounded-lg p-1.5 items-center justify-center text-[var(--ink)] hover:border-indigo-400 cursor-pointer shadow-xs relative shrink-0"
          >
            <Inbox className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            {typeof todoCount === 'number' && todoCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-mono font-bold flex items-center justify-center ring-1 ring-white dark:ring-slate-900">
                {todoCount}
              </span>
            )}
          </button>
        )}

        {/* Mini Completion Ring */}
        <button
          type="button"
          onClick={onOpenDayDist}
          title={lang === 'ar' ? 'انقر لعرض توزيع اليوم الكامل' : 'Click to view full day distribution'}
          className="bg-[var(--card)] border border-[var(--line)] rounded-lg px-2 py-1 flex items-center gap-1.5 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-all shadow-xs shrink-0"
        >
          <svg width="22" height="22" viewBox="0 0 32 32">
            <circle cx={mcx} cy={mcy} r={mr} fill="none" stroke="var(--line)" strokeWidth="3" />
            <circle
              cx={mcx}
              cy={mcy}
              r={mr}
              fill="none"
              stroke="var(--teal)"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeDasharray={mcirc}
              strokeDashoffset={strokeOffset}
              transform={`rotate(-90 ${mcx} ${mcy})`}
            />
          </svg>
          <span className="text-xs font-bold text-[var(--ink)] font-mono whitespace-nowrap">
            {loggedCount}/{totalActiveHours}
          </span>
        </button>
      </div>

      {/* Center: Live Real-time Clock on Desktop */}
      <div className="hidden md:flex items-center justify-center shrink-0">
        {/* Offline Mode Badge */}
        {!isOnline && (
          <div
            className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-lg text-[11px] font-bold shadow-xs flex items-center gap-1 animate-pulse mr-1.5 sm:mr-2"
            title={lang === 'ar' ? 'أنت في وضع عدم الاتصال - تحفظ البيانات محلياً' : 'Offline Mode - Changes saved locally'}
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'ar' ? 'دون إنترنت' : 'Offline'}</span>
          </div>
        )}

        <div
          className="bg-indigo-50/90 dark:bg-indigo-950/50 border border-indigo-200/90 dark:border-indigo-800/70 text-indigo-700 dark:text-indigo-300 px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-mono font-bold shadow-xs flex items-center gap-1.5 select-none ring-1 ring-indigo-500/10"
          title={lang === 'ar' ? 'الوقت الحالي المباشر' : 'Current Live Time'}
        >
          <Clock className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="tracking-wide whitespace-nowrap">{liveTime}</span>
        </div>
      </div>

      {/* End / Left on Desktop: Detailed View Toggle, Settings, and Auth */}
      <div className="hidden md:flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Toggle Detailed vs Compact View */}
        <button
          type="button"
          onClick={onToggleDetailedView}
          className={`border rounded-lg px-2 sm:px-2.5 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
            isDetailedView
              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 font-bold ring-1 ring-indigo-500/20'
              : 'bg-[var(--card)] border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)] hover:border-slate-300 dark:hover:border-slate-600'
          }`}
          title={isDetailedView ? (lang === 'ar' ? 'عرض مدمج (إخفاء شريط الأسبوع)' : 'Compact View') : (lang === 'ar' ? 'عرض تفصيلي (إظهار شريط الأسبوع)' : 'Detailed View')}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden md:inline whitespace-nowrap">{isDetailedView ? t.expandedBtn : t.compactBtn}</span>
        </button>

        {/* Brain Dump & Todo Inbox Button on Desktop */}
        {onOpenTodoInbox && (
          <button
            type="button"
            onClick={onOpenTodoInbox}
            className="bg-[var(--card)] border border-[var(--line)] rounded-lg px-2 sm:px-2.5 py-1.5 text-xs font-medium text-[var(--ink)] hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 hover:bg-[var(--bg)] transition-all shadow-xs cursor-pointer relative"
            title={lang === 'ar' ? 'صندوق تفريغ الأفكار والمهام (Brain Dump)' : 'Brain Dump & Tasks'}
          >
            <Inbox className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="hidden md:inline whitespace-nowrap">{lang === 'ar' ? 'الأفكار والمهام' : 'Inbox'}</span>
            {typeof todoCount === 'number' && todoCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                {todoCount}
              </span>
            )}
          </button>
        )}

        {/* Settings Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="bg-[var(--card)] border border-[var(--line)] rounded-lg px-2 sm:px-2.5 py-1.5 text-xs font-medium text-[var(--ink)] hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 hover:bg-[var(--bg)] transition-all shadow-xs cursor-pointer"
          title={lang === 'ar' ? 'الإعدادات والتفضيلات' : 'Settings & Preferences'}
        >
          <Settings className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="hidden md:inline whitespace-nowrap">{lang === 'ar' ? 'الإعدادات' : 'Settings'}</span>
        </button>

        {/* User Auth Direct Action */}
        {currentUser ? (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <img
                src={
                  currentUser.photoURL ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    currentUser.displayName || currentUser.email || 'User'
                  )}&background=4F46E5&color=ffffff`
                }
                alt="Avatar"
                className="w-4 h-4 rounded-full object-cover shrink-0"
              />
              <span className="max-w-[70px] truncate font-medium hidden sm:inline">
                {currentUser.displayName?.split(' ')[0] || currentUser.email?.split('@')[0]}
              </span>
              <ChevronDown className="w-3 h-3 opacity-80 shrink-0" />
            </button>

            {menuOpen && (
              <div
                className={`absolute top-full mt-1.5 z-50 bg-[var(--card)] border border-[var(--line)] rounded-xl p-1.5 shadow-xl min-w-[170px] flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95 duration-100 ${
                  lang === 'ar' ? 'left-0' : 'right-0'
                }`}
              >
                <div className="px-2 py-1 text-[11px] text-[var(--ink-soft)] font-medium truncate border-b border-[var(--line)]">
                  {currentUser.email}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full flex items-center justify-between gap-2 p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium transition-all cursor-pointer"
                >
                  <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer whitespace-nowrap"
          >
            <LogIn className="w-3.5 h-3.5 shrink-0" />
            <span>{t.loginBtn}</span>
          </button>
        )}
      </div>
    </header>
  );
};
