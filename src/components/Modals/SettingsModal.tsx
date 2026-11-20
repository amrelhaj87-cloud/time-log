import React, { useState } from 'react';
import { SleepSettings, AgeDisplayOpt, WeekStartDay, ThemeMode, TagTargets } from '../../types';
import { STRINGS, DEFAULT_TAG_TARGETS, TAGS_CONFIG, APP_VERSION } from '../../constants/config';
import { soundManager } from '../../utils/soundEffects';
import KofiButton from '../KofiButton';
import './settingsFlat.css';
import {
  X,
  Settings,
  Moon,
  Sun,
  Laptop,
  Cake,
  Calendar,
  Smartphone,
  Mail,
  Sparkles,
  Globe,
  Check,
  BookOpen,
  ArrowUpRight,
  CalendarDays,
  Volume2,
  Flame,
  Target,
  SlidersHorizontal,
  Inbox,
  LayoutGrid,
  Cloud,
  RefreshCw
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sleepSettings: SleepSettings;
  onChangeSleepSettings: (settings: SleepSettings) => void;
  userBirthDate: string;
  ageDisplayOpt: AgeDisplayOpt;
  onSaveAge: (birthDate: string, opt: AgeDisplayOpt) => void;
  weekStartDay: WeekStartDay;
  onChangeWeekStartDay: (day: WeekStartDay) => void;
  isDetailedView?: boolean;
  onToggleDetailedView?: (enabled: boolean) => void;
  devToolsEnabled: boolean;
  onToggleDevTools: (enabled: boolean) => void;
  showStreakBadge?: boolean;
  onToggleStreakBadge?: (enabled: boolean) => void;
  showAgeBadge?: boolean;
  onToggleAgeBadge?: (enabled: boolean) => void;
  currentUserEmail?: string | null;
  onDisconnectGCal?: () => void;
  showFocusModeButton?: boolean;
  onToggleShowFocusModeButton?: (enabled: boolean) => void;
  showGoldenGoal?: boolean;
  onToggleShowGoldenGoal?: (enabled: boolean) => void;
  showPriorityMatrix?: boolean;
  onToggleShowPriorityMatrix?: (enabled: boolean) => void;
  showTodoInbox?: boolean;
  onToggleShowTodoInbox?: (enabled: boolean) => void;
  onToggleAllPlanningSuite?: (enabled: boolean) => void;
  morningNudgeEnabled?: boolean;
  onToggleMorningNudge?: (enabled: boolean) => void;
  eveningWrapUpEnabled?: boolean;
  onToggleEveningWrapUp?: (enabled: boolean) => void;
  tagTargets?: TagTargets;
  onChangeTagTargets?: (targets: TagTargets) => void;
  isCalSyncConnected: boolean;
  onConnectGCal: () => void;
  calSyncEnabled: boolean;
  onToggleCalSync: (enabled: boolean) => void;
  autoCloudSync?: boolean;
  onToggleAutoCloudSync?: (enabled: boolean) => void;
  onSyncAllToCloudNow?: () => Promise<{ synced: number; skipped: number; errors: number } | undefined>;
  isSyncingAllWeeks?: boolean;
  isUserLoggedIn?: boolean;
  onOpenPwaModal: () => void;
  onOpenGuide: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  themeMode?: ThemeMode;
  isDarkEffective?: boolean;
  onChangeThemeMode?: (mode: ThemeMode) => void;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  sleepSettings,
  onChangeSleepSettings,
  userBirthDate,
  ageDisplayOpt,
  onSaveAge,
  weekStartDay,
  onChangeWeekStartDay,
  isDetailedView = false,
  onToggleDetailedView,
  devToolsEnabled,
  onToggleDevTools,
  showStreakBadge = true,
  onToggleStreakBadge,
  showAgeBadge = false,
  onToggleAgeBadge,
  currentUserEmail,
  onDisconnectGCal,
  showFocusModeButton = false,
  onToggleShowFocusModeButton,
  showGoldenGoal = false,
  onToggleShowGoldenGoal,
  showPriorityMatrix = false,
  onToggleShowPriorityMatrix,
  showTodoInbox = true,
  onToggleShowTodoInbox,
  onToggleAllPlanningSuite,
  morningNudgeEnabled = false,
  onToggleMorningNudge,
  eveningWrapUpEnabled = false,
  onToggleEveningWrapUp,
  tagTargets = DEFAULT_TAG_TARGETS,
  onChangeTagTargets,
  isCalSyncConnected,
  onConnectGCal,
  calSyncEnabled,
  onToggleCalSync,
  autoCloudSync = false,
  onToggleAutoCloudSync,
  onSyncAllToCloudNow,
  isSyncingAllWeeks = false,
  isUserLoggedIn = false,
  onOpenPwaModal,
  onOpenGuide,
  themeMode = 'light',
  isDarkEffective = false,
  onChangeThemeMode,
  lang,
  onToggleLang
}) => {
  const [soundEnabled, setSoundEnabled] = useState(() => soundManager.isEnabled());
  const [birthDateInput, setBirthDateInput] = useState(userBirthDate);
  const [ageOptInput, setAgeOptInput] = useState<AgeDisplayOpt>(ageDisplayOpt);
  const [syncResultMsg, setSyncResultMsg] = useState<string | null>(null);

  const handleTriggerManualCloudSync = async () => {
    if (!onSyncAllToCloudNow) return;
    setSyncResultMsg(null);
    try {
      const res = await onSyncAllToCloudNow();
      if (res) {
        setSyncResultMsg(
          lang === 'ar'
            ? `✓ تمت مزامنة ${res.synced} أسبوع (${res.skipped} متطابق)`
            : `✓ Synced ${res.synced} weeks (${res.skipped} up to date)`
        );
        setTimeout(() => setSyncResultMsg(null), 3500);
      }
    } catch {
      setSyncResultMsg(lang === 'ar' ? 'تعذر إتمام المزامنة السحابية' : 'Cloud sync failed');
      setTimeout(() => setSyncResultMsg(null), 3500);
    }
  };

  const t = STRINGS[lang];

  if (!isOpen) return null;

  // Sleep options (0 to 23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${String(i).padStart(2, '0')}:00`
  }));

  const sleepHours = sleepSettings.enabled
    ? (sleepSettings.end - sleepSettings.start + 24) % 24 || 0
    : 0;
  const activeHours = 24 - sleepHours;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl w-full max-w-2xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)] bg-[var(--card)] shrink-0 z-10">
          <div className="flex items-center gap-2.5 font-bold text-lg text-[var(--ink)]">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Settings className="w-5 h-5" />
            </div>
            <span>{lang === 'ar' ? 'الإعدادات والتفضيلات' : 'Settings & Preferences'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--ink-soft)] hover:text-rose-500 p-1.5 rounded-lg transition-all cursor-pointer hover:bg-[var(--bg)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">

          {/* 1. TOP PRIORITY: Primary Quick Preferences */}
          <div className="settings-flat">
            {/* Theme Mode 3-Way Selector Card */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3 flex flex-col justify-between gap-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] shrink-0">
                    {themeMode === 'system' ? (
                      <Laptop className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    ) : themeMode === 'dark' ? (
                      <Moon className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-[var(--ink)] block">
                      {t.themeModeLabel}
                    </span>
                    <span className="text-[11px] text-[var(--ink-soft)]">
                      {themeMode === 'system'
                        ? (lang === 'ar' ? `تلقائي حسب الجهاز (${isDarkEffective ? 'ليلي' : 'نهاري'})` : `System auto (${isDarkEffective ? 'Dark' : 'Light'})`)
                        : themeMode === 'dark'
                        ? (lang === 'ar' ? 'ليلي أسود عميق' : 'Deep Black Dark')
                        : (lang === 'ar' ? 'نهاري ناصع' : 'Light Mode')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3-Way Segmented Control */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-[var(--card)] border border-[var(--line)] rounded-xl">
                <button
                  type="button"
                  onClick={() => onChangeThemeMode && onChangeThemeMode('light')}
                  className={`py-1.5 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer select-none ${
                    themeMode === 'light'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)]'
                  }`}
                  title={lang === 'ar' ? 'الوضع النهاري' : 'Light Mode'}
                >
                  <Sun className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{lang === 'ar' ? 'نهاري' : 'Light'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeThemeMode && onChangeThemeMode('dark')}
                  className={`py-1.5 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer select-none ${
                    themeMode === 'dark'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)]'
                  }`}
                  title={lang === 'ar' ? 'الوضع الليلي الأسود' : 'Deep Dark Mode'}
                >
                  <Moon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{lang === 'ar' ? 'ليلي' : 'Dark'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeThemeMode && onChangeThemeMode('system')}
                  className={`py-1.5 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer select-none ${
                    themeMode === 'system'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)]'
                  }`}
                  title={lang === 'ar' ? 'التزامن تلقائياً مع الجهاز (الوضع الافتراضي)' : 'Sync with system OS (Default)'}
                >
                  <Laptop className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{lang === 'ar' ? 'الجهاز' : 'Auto'}</span>
                </button>
              </div>
            </div>

            {/* Language Switch Toggle (Standard Toggle Style) */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[var(--card)] border border-[var(--line)] text-indigo-600 dark:text-indigo-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-[var(--ink)] block">
                    {lang === 'ar' ? 'لغة الواجهة' : 'Language'}
                  </span>
                  <span className="text-[11px] text-[var(--ink-soft)]">
                    {lang === 'ar' ? 'العربية (AR)' : 'English (EN)'}
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={lang === 'en'}
                  onChange={onToggleLang}
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Timer Chime Sound Toggle */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[var(--card)] border border-[var(--line)] text-indigo-600 dark:text-indigo-400">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-[var(--ink)] block">
                    {t.soundSettingLabel}
                  </span>
                  <span className="text-[11px] text-[var(--ink-soft)]">
                    {soundEnabled ? (lang === 'ar' ? 'مفعل' : 'Enabled') : (lang === 'ar' ? 'معطل' : 'Disabled')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playTimerCompleteChime();
                  }}
                  className="px-2 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-[var(--card)] border border-[var(--line)] hover:border-indigo-400 rounded-lg transition-all cursor-pointer"
                  title={lang === 'ar' ? 'تجربة رنة التنبيه' : 'Test chime sound'}
                >
                  🔔
                </button>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={soundEnabled}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setSoundEnabled(next);
                      soundManager.setEnabled(next);
                      if (next) soundManager.playTimerCompleteChime();
                    }}
                  />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            {/* Detailed View / Week Strip Toggle */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[var(--ink)] block">
                    {lang === 'ar' ? 'عرض شريط الأيام والإحصائيات (تفصيلي)' : 'Detailed Week & Tag Stats'}
                  </h4>
                  <span className="text-[11px] text-[var(--ink-soft)]">
                    {isDetailedView
                      ? (lang === 'ar' ? 'مفعل (شريط الأسبوع ظاهر)' : 'Detailed (Visible)')
                      : (lang === 'ar' ? 'معطل (مدمج - شريط الأسبوع مخفي)' : 'Compact (Hidden)')}
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isDetailedView}
                  onChange={(e) => onToggleDetailedView?.(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Focus Mode Button Toggle */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[var(--ink)] block">{t.focusModeLabel}</h4>
                  <span className="text-[11px] text-[var(--ink-soft)]">
                    {showFocusModeButton ? (lang === 'ar' ? 'مفعل (يظهر زر البومودورو)' : 'Visible') : (lang === 'ar' ? 'معطل (مخفي)' : 'Hidden')}
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={showFocusModeButton}
                  onChange={(e) => onToggleShowFocusModeButton?.(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Unified Planning, Goals & Tasks Suite Toggle Card (Master + 3 Sub-toggles) */}
            {(() => {
              const planningItems = [
                {
                  key: 'golden',
                  checked: showGoldenGoal,
                  onToggle: onToggleShowGoldenGoal,
                  icon: <Sparkles className="w-3.5 h-3.5" />,
                  iconBg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
                  label: lang === 'ar' ? 'الهدف الذهبي لليوم' : 'Golden Goal (The One Thing)',
                  sub: lang === 'ar' ? 'بطاقة أهم إنجاز لليوم أسفل الساعات' : 'Single top goal card below hours'
                },
                {
                  key: 'matrix',
                  checked: showPriorityMatrix,
                  onToggle: onToggleShowPriorityMatrix,
                  icon: <LayoutGrid className="w-3.5 h-3.5" />,
                  iconBg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400',
                  label: lang === 'ar' ? 'مصفوفة الأولويات (المربعات الـ 4)' : 'Priority Matrix (4 Quadrants)',
                  sub: lang === 'ar' ? 'المربعات الأربعة لفرز المهام وترحيلها' : 'Eisenhower 4-quadrant tasks & rollover'
                },
                {
                  key: 'inbox',
                  checked: showTodoInbox,
                  onToggle: onToggleShowTodoInbox,
                  icon: <Inbox className="w-3.5 h-3.5" />,
                  iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
                  label: lang === 'ar' ? 'صندوق الأفكار والمهام' : 'Ideas & Tasks Inbox (Brain Dump)',
                  sub: lang === 'ar' ? 'زر الأفكار والمهام في الترويسة واختصار Alt+T' : 'Header Inbox drawer & Alt+T shortcut'
                }
              ];
              const enabledCount = planningItems.filter((item) => item.checked).length;
              const masterChecked = enabledCount > 0;

              return (
                <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex flex-col gap-3 shadow-xs sm:col-span-2">
                  {/* Master Toggle Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-[var(--ink)] block">
                          {lang === 'ar' ? 'منظومة التخطيط والأهداف والمهام' : 'Planning, Goals & Tasks Suite'}
                        </h4>
                        <span className="text-[11px] text-[var(--ink-soft)] block">
                          {enabledCount === 3
                            ? (lang === 'ar' ? 'الكل مفعل (الذهبي + المصفوفات الـ 4 + الأفكار والمهام)' : 'All active (Golden Goal + 4 Quadrants + Inbox)')
                            : enabledCount === 0
                            ? (lang === 'ar' ? 'معطل بالكامل (عرض جدول الساعات الصافي فقط)' : 'All hidden (clean timeline view only)')
                            : (lang === 'ar' ? `مفعل جزئياً (${enabledCount} من 3 عناصر)` : `Partially active (${enabledCount} of 3)`)}
                        </span>
                      </div>
                    </div>
                    <label
                      className="relative inline-flex items-center cursor-pointer shrink-0"
                      title={lang === 'ar' ? 'تشغيل أو إيقاف العناصر الثلاثة دفعة واحدة' : 'Toggle all 3 planning tools together'}
                    >
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={masterChecked}
                        onChange={(e) => onToggleAllPlanningSuite?.(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* 3 Independent Sub-Toggles inside the Card */}
                  <div className="border-t border-dashed border-[var(--line)] pt-2.5 flex flex-col gap-2 ps-1">
                    {planningItems.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-[var(--card)] border border-[var(--line)]"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1.5 rounded-md shrink-0 ${item.iconBg}`}>{item.icon}</div>
                          <div className="min-w-0">
                            <span className="font-semibold text-[11px] text-[var(--ink)] block">{item.label}</span>
                            <span className="text-[10px] text-[var(--ink-faint)] block">{item.sub}</span>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={item.checked}
                            onChange={(e) => item.onToggle?.(e.target.checked)}
                          />
                          <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Morning Nudge Toggle */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[var(--ink)] block">
                    {lang === 'ar' ? 'همسة الصباح (تحليل إنجاز أمس)' : 'Morning Nudge (Yesterday Review)'}
                  </h4>
                  <span className="text-[11px] text-[var(--ink-soft)]">
                    {morningNudgeEnabled
                      ? (lang === 'ar' ? 'مفعل (يظهر بين 8ص و 2م مرة باليوم)' : 'Active (8 AM - 2 PM once daily)')
                      : (lang === 'ar' ? 'معطل' : 'Disabled')}
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={morningNudgeEnabled}
                  onChange={(e) => onToggleMorningNudge?.(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Evening Wrap-up Toggle */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[var(--ink)] block">
                    {lang === 'ar' ? 'حصاد المساء (مراجعة اليوم المنتهي)' : 'Evening Wrap-up (Yesterday Review)'}
                  </h4>
                  <span className="text-[11px] text-[var(--ink-soft)]">
                    {eveningWrapUpEnabled
                      ? (lang === 'ar' ? 'مفعل (يظهر من 5 صباحاً مرة لكل يوم)' : 'Active (from 5 AM, once per day)')
                      : (lang === 'ar' ? 'معطل' : 'Disabled')}
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={eveningWrapUpEnabled}
                  onChange={(e) => onToggleEveningWrapUp?.(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Target Hours Quota / Weights Card */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex flex-col gap-2.5 shadow-xs sm:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[var(--ink)]">
                      {lang === 'ar' ? 'الأوزان اليومية المستهدفة (ساعات لكل جانب)' : 'Daily Target Quotas (Hours per Tag)'}
                    </h4>
                    <span className="text-[10px] text-[var(--ink-soft)]">
                      {lang === 'ar'
                        ? 'مؤشر استرشادي يساعد في تقييم توازنك اليومي في همسة الصباح والتقارير'
                        : 'Mindful target guide to assess daily balance in morning nudge & stats'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onChangeTagTargets?.(DEFAULT_TAG_TARGETS)}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {lang === 'ar' ? 'استعادة الافتراضي' : 'Reset Defaults'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-[var(--line)]">
                {(['E', 'V', 'R', 'S', 'SC'] as const).map((code) => {
                  const cfg = TAGS_CONFIG[code];
                  const currentVal = tagTargets[code] !== undefined ? tagTargets[code] : DEFAULT_TAG_TARGETS[code];
                  return (
                    <div
                      key={code}
                      className="bg-[var(--card)] border border-[var(--line)] rounded-xl p-2 flex flex-col items-center gap-1 shadow-2xs"
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black" style={{ color: cfg.color }}>
                          {code}
                        </span>
                        <span className="text-[11px] font-bold text-[var(--ink)] truncate max-w-[70px]">
                          {cfg.fullTitle[lang].split(' ')[0]}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 w-full justify-center">
                        <input
                          type="number"
                          min="0"
                          max="16"
                          value={currentVal}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(16, parseInt(e.target.value, 10) || 0));
                            onChangeTagTargets?.({ ...tagTargets, [code]: val });
                          }}
                          className="w-12 text-center font-mono font-bold text-xs bg-[var(--bg)] border border-[var(--line)] rounded-lg py-0.5 text-[var(--ink)] outline-hidden focus:border-indigo-500"
                        />
                        <span className="text-[10px] font-mono text-[var(--ink-soft)]">
                          {lang === 'ar' ? 'س' : 'h'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Streak Flame Badge Toggle */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[var(--ink)] block">{t.streakSettingLabel}</h4>
                  <span className="text-[11px] text-[var(--ink-soft)]">
                    {showStreakBadge ? (lang === 'ar' ? 'مفعل' : 'Enabled') : (lang === 'ar' ? 'معطل' : 'Disabled')}
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={showStreakBadge}
                  onChange={(e) => onToggleStreakBadge?.(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Advanced Tools Toolbar Toggle */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[var(--ink)] block">{t.devToolsSectionTitle}</h4>
                  <span className="text-[11px] text-[var(--ink-soft)]">
                    {devToolsEnabled ? (lang === 'ar' ? 'مفعل' : 'Enabled') : (lang === 'ar' ? 'معطل' : 'Disabled')}
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={devToolsEnabled}
                  onChange={(e) => onToggleDevTools(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Compact Week Start Day Card (Side-by-side with siblings) */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex flex-col justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs text-[var(--ink)] block">{t.weekStartSectionTitle}</h4>
                  <span className="text-[11px] text-[var(--ink-soft)] truncate block">
                    {weekStartDay === 'saturday' ? t.optSaturday : weekStartDay === 'sunday' ? t.optSunday : t.optMonday}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-[var(--line)]">
                {[
                  { val: 'saturday' as const, label: t.optSaturday },
                  { val: 'sunday' as const, label: t.optSunday },
                  { val: 'monday' as const, label: t.optMonday }
                ].map((item) => {
                  const isSelected = weekStartDay === item.val;
                  return (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => onChangeWeekStartDay(item.val)}
                      className={`py-1 px-1 rounded-lg border text-center font-bold text-[11px] transition-all cursor-pointer truncate ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                          : 'border-[var(--line)] bg-[var(--card)] hover:border-indigo-400 text-[var(--ink)]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Compact Sleep & Wake Settings Card */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex flex-col justify-between gap-2 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-[var(--ink)] block truncate">{t.sleepSettingsTitle}</h4>
                    <span className="text-[11px] text-[var(--ink-soft)] block truncate">
                      {sleepSettings.enabled
                        ? `${sleepHours} ${t.sleepHoursLabel} • ${activeHours} ${t.activeHoursLabel}`
                        : (lang === 'ar' ? 'معطل (حساب 24 ساعة)' : 'Disabled (24h active)')}
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={sleepSettings.enabled}
                    onChange={(e) =>
                      onChangeSleepSettings({
                        ...sleepSettings,
                        enabled: e.target.checked
                      })
                    }
                  />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {sleepSettings.enabled && (
                <div className="pt-2 border-t border-[var(--line)] grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--ink-soft)] mb-0.5">
                      {lang === 'ar' ? 'وقت النوم:' : 'Bedtime:'}
                    </label>
                    <select
                      value={sleepSettings.start}
                      onChange={(e) =>
                        onChangeSleepSettings({
                          ...sleepSettings,
                          start: parseInt(e.target.value, 10)
                        })
                      }
                      className="w-full bg-[var(--card)] border border-[var(--line)] rounded-lg px-2 py-1 text-xs font-bold text-[var(--ink)] focus:outline-none focus:border-indigo-500"
                    >
                      {hourOptions.map((opt) => (
                        <option key={`start-${opt.value}`} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--ink-soft)] mb-0.5">
                      {lang === 'ar' ? 'الاستيقاظ:' : 'Wake time:'}
                    </label>
                    <select
                      value={sleepSettings.end}
                      onChange={(e) =>
                        onChangeSleepSettings({
                          ...sleepSettings,
                          end: parseInt(e.target.value, 10)
                        })
                      }
                      className="w-full bg-[var(--card)] border border-[var(--line)] rounded-lg px-2 py-1 text-xs font-bold text-[var(--ink)] focus:outline-none focus:border-indigo-500"
                    >
                      {hourOptions.map((opt) => (
                        <option key={`end-${opt.value}`} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Compact Age & Birthday Settings Card with Explicit Toggle */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex flex-col justify-between gap-2 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-500 shrink-0">
                    <Cake className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-[var(--ink)] block truncate">{t.ageSectionTitle}</h4>
                    <span className="text-[11px] text-[var(--ink-soft)] block truncate">
                      {showAgeBadge && birthDateInput
                        ? (ageOptInput === 'years'
                            ? (lang === 'ar' ? 'مفعل (عرض بالسنين)' : 'Active (Years)')
                            : ageOptInput === 'days'
                            ? (lang === 'ar' ? 'مفعل (عرض بالأيام)' : 'Active (Days)')
                            : (lang === 'ar' ? 'مفعل (تنبيهات فقط)' : 'Active (Alerts only)'))
                        : (lang === 'ar' ? 'معطل (الشارة مخفية)' : 'Disabled (Badge hidden)')}
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0" title={lang === 'ar' ? 'تفعيل أو إخفاء الشارة' : 'Toggle Age Badge'}>
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={showAgeBadge}
                    onChange={(e) => onToggleAgeBadge?.(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="pt-2 border-t border-[var(--line)] flex items-center gap-1.5">
                <input
                  type="date"
                  value={birthDateInput}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setBirthDateInput(newDate);
                    onSaveAge(newDate, ageOptInput);
                    if (newDate && !showAgeBadge) {
                      onToggleAgeBadge?.(true);
                    }
                  }}
                  className="flex-1 min-w-0 bg-[var(--card)] border border-[var(--line)] rounded-lg px-2 py-1 text-xs text-[var(--ink)] focus:outline-none focus:border-indigo-500 font-mono"
                  title={t.lblBirthDate}
                />

                {birthDateInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setBirthDateInput('');
                      onSaveAge('', 'none');
                      onToggleAgeBadge?.(false);
                    }}
                    className="px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-bold transition-all cursor-pointer shrink-0"
                    title={lang === 'ar' ? 'مسح تاريخ الميلاد' : 'Clear Birth Date'}
                  >
                    {lang === 'ar' ? 'مسح' : 'Clear'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const nextOpt = ageOptInput === 'years' ? 'none' : 'years';
                    setAgeOptInput(nextOpt);
                    onSaveAge(birthDateInput, nextOpt);
                  }}
                  className={`px-2 py-1 rounded-lg border font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    ageOptInput === 'years'
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-2xs'
                      : 'border-[var(--line)] bg-[var(--card)] hover:border-indigo-400 text-[var(--ink-soft)] hover:text-[var(--ink)]'
                  }`}
                  title={lang === 'ar' ? 'العمر بالسنين' : 'Years'}
                >
                  <span>🎂</span>
                  <span>{lang === 'ar' ? 'سنين' : 'Yrs'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const nextOpt = ageOptInput === 'days' ? 'none' : 'days';
                    setAgeOptInput(nextOpt);
                    onSaveAge(birthDateInput, nextOpt);
                  }}
                  className={`px-2 py-1 rounded-lg border font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    ageOptInput === 'days'
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-2xs'
                      : 'border-[var(--line)] bg-[var(--card)] hover:border-indigo-400 text-[var(--ink-soft)] hover:text-[var(--ink)]'
                  }`}
                  title={lang === 'ar' ? 'العمر بالأيام' : 'Days'}
                >
                  <span>⏳</span>
                  <span>{lang === 'ar' ? 'أيام' : 'Days'}</span>
                </button>
              </div>
            </div>

            {/* Auto Cloud Sync Card (Toggle + Manual Sync Button) */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex flex-col gap-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-[var(--ink)] block truncate">
                      {lang === 'ar' ? 'المزامنة السحابية الشاملة' : 'Full Cloud Sync'}
                    </h4>
                    <span className="text-[11px] text-[var(--ink-soft)] block truncate">
                      {isUserLoggedIn
                        ? autoCloudSync
                          ? (lang === 'ar' ? 'مفعلة ✓ (مزامنة كل الأسابيع تلقائياً)' : 'Active ✓ (Auto-syncs all weeks)')
                          : (lang === 'ar' ? 'يدوية (يمكنك المزامنة بضغطة زر)' : 'Manual (Sync on demand)')
                        : (lang === 'ar' ? 'يتطلب تسجيل الدخول بحساب جوجل' : 'Requires Google Login')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isUserLoggedIn && (
                    <button
                      type="button"
                      disabled={isSyncingAllWeeks}
                      onClick={handleTriggerManualCloudSync}
                      className="px-2.5 py-1 rounded-lg font-semibold text-xs transition-all shadow-xs cursor-pointer bg-[var(--card)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--ink)] flex items-center gap-1.5 disabled:opacity-50"
                      title={lang === 'ar' ? 'مزامنة كل الأسابيع المسجلة محلياً إلى السحابة فوراً' : 'Sync all local weeks to cloud now'}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAllWeeks ? 'animate-spin text-blue-600' : ''}`} />
                      <span>{isSyncingAllWeeks ? (lang === 'ar' ? 'جارٍ المزامنة...' : 'Syncing...') : (lang === 'ar' ? 'مزامنة الآن' : 'Sync Now')}</span>
                    </button>
                  )}
                  {isUserLoggedIn && (
                    <label className="relative inline-flex items-center cursor-pointer" title={lang === 'ar' ? 'المزامنة التلقائية لكل الأسابيع' : 'Auto Cloud Sync'}>
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={autoCloudSync}
                        onChange={(e) => onToggleAutoCloudSync?.(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  )}
                </div>
              </div>
              {syncResultMsg && (
                <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 animate-in fade-in">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{syncResultMsg}</span>
                </div>
              )}
            </div>

            {/* Google Calendar Sync Card (Toggle + Connect/Disconnect Button + Account Email) */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs text-[var(--ink)] block truncate">{lang === 'ar' ? 'ربط تقويم جوجل' : 'Google Calendar'}</h4>
                  <span className="text-[11px] text-[var(--ink-soft)] block truncate">
                    {isCalSyncConnected
                      ? (lang === 'ar' ? `متصل ✓ (${currentUserEmail || 'Google'})` : `Connected ✓ (${currentUserEmail || 'Google'})`)
                      : calSyncEnabled
                      ? (lang === 'ar' ? 'مفعل ✓ (يحتاج تحديث الرمز 🔄)' : 'Active ✓ (Refresh Token 🔄)')
                      : (lang === 'ar' ? 'غير متصل' : 'Disconnected')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isCalSyncConnected ? (
                  <button
                    type="button"
                    onClick={onDisconnectGCal}
                    className="px-2.5 py-1 rounded-lg font-semibold text-xs transition-all shadow-xs cursor-pointer bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100"
                    title={lang === 'ar' ? 'فصل حساب التقويم' : 'Disconnect calendar'}
                  >
                    {lang === 'ar' ? 'فصل' : 'Disconnect'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onConnectGCal}
                    className="px-2.5 py-1 rounded-lg font-semibold text-xs transition-all shadow-xs cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {calSyncEnabled ? (lang === 'ar' ? 'تحديث الرمز' : 'Refresh Token') : (lang === 'ar' ? 'ربط الحساب' : 'Connect')}
                  </button>
                )}
                <label className="relative inline-flex items-center cursor-pointer" title={lang === 'ar' ? 'مزامنة أحداث التقويم' : 'Sync Calendar Events'}>
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={calSyncEnabled}
                    onChange={(e) => onToggleCalSync(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            {/* PWA / Install Application Card */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[var(--ink)] block">{t.appInstallSectionTitle}</h4>
                  <span className="text-[11px] text-[var(--ink-soft)]">
                    {lang === 'ar' ? 'الشاشة الرئيسية' : 'Home Screen'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPwaModal();
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs cursor-pointer transition-all shadow-xs whitespace-nowrap"
              >
                {lang === 'ar' ? 'تثبيت' : 'Install'}
              </button>
            </div>

            {/* Time Log Comprehensive Guide Card */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[var(--ink)] block">{t.guideSettingsLabel}</h4>
                  <span className="text-[11px] text-[var(--ink-soft)]">
                    {lang === 'ar' ? 'فلسفة التاقات والأهداف' : 'Tags & Philosophy'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenGuide();
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs cursor-pointer transition-all shadow-xs whitespace-nowrap flex items-center gap-1"
              >
                <span>{t.txtGuideSettingsBtn}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Ko-fi Support Card */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex items-center justify-between shadow-xs sm:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#ff5e5b]/10 text-[#ff5e5b] shrink-0">
                  <span className="text-base">☕</span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[var(--ink)] block">
                    {lang === 'ar' ? 'ادعم استمرار وتطوير التطبيق' : 'Support App Development'}
                  </h4>
                  <span className="text-[11px] text-[var(--ink-soft)]">
                    {lang === 'ar' ? 'عبر منصة Ko-fi' : 'via Ko-fi'}
                  </span>
                </div>
              </div>
              <KofiButton username="zerocold" />
            </div>
          </div>

          {/* Contact & Support Section */}
          <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-4 flex flex-col gap-3.5 shadow-xs">
            <form
              action="https://formsubmit.co/amr.elhaj87@gmail.com"
              method="POST"
              className="flex flex-col gap-3"
            >
              <input type="hidden" name="_subject" value="[سجل الوقت] رسالة جديدة" />

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[var(--ink)]">{t.contactSectionTitle}</h4>
                  <p className="text-xs text-[var(--ink-soft)] leading-relaxed mt-0.5">
                    {lang === 'ar'
                      ? 'التطبيق يكبر بأفكاركم ودعمكم المستمر. يسعدنا معرفة رأيك أو ما يجول في خاطرك.'
                      : 'Time Log grows with your ideas and kind support. We would love to hear your thoughts!'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-3 border-t border-[var(--line)]">
                <div>
                  <label className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">
                    {lang === 'ar' ? 'الاسم (اختياري):' : 'Name (optional):'}
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder={lang === 'ar' ? 'اسمك الكريم...' : 'Your name...'}
                    className="w-full bg-[var(--card)] border border-[var(--line)] rounded-xl px-3 py-2 text-xs text-[var(--ink)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">
                    {t.lblContactEmail}
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder={t.contactEmailPlaceholder}
                    className="w-full bg-[var(--card)] border border-[var(--line)] rounded-xl px-3 py-2 text-xs text-[var(--ink)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">
                    {t.lblContactMessage}
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={3}
                    placeholder={t.contactMessagePlaceholder}
                    className="w-full bg-[var(--card)] border border-[var(--line)] rounded-xl px-3 py-2 text-xs text-[var(--ink)] focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>{t.btnSendContactText}</span>
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Modal Bottom Close Footer */}
        <div className="px-5 py-3 border-t border-[var(--line)] bg-[var(--card)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--ink-soft)] font-medium">
            <span>{lang === 'ar' ? 'جميع الحقوق محفوظة © zerocold 2026' : 'All rights reserved © zerocold 2026'}</span>
            <span className="text-[var(--line)]">•</span>
            <span className="font-mono font-bold text-[10px] text-indigo-600 dark:text-indigo-400">{APP_VERSION}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[var(--bg)] hover:bg-[var(--line)] border border-[var(--line)] font-semibold text-xs text-[var(--ink)] cursor-pointer transition-all"
          >
            {lang === 'ar' ? 'إغلاق النافذة' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
