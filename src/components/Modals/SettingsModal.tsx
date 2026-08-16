import React, { useState } from 'react';
import { SleepSettings, AgeDisplayOpt, WeekStartDay, ThemeMode } from '../../types';
import { STRINGS } from '../../constants/config';
import emailjs from '@emailjs/browser';
import { soundManager } from '../../utils/soundEffects';
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
  CheckCircle,
  AlertCircle,
  Sparkles,
  Globe,
  Check,
  BookOpen,
  ArrowUpRight,
  CalendarDays,
  Volume2,
  Bell,
  Flame,
  Target
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
  devToolsEnabled: boolean;
  onToggleDevTools: (enabled: boolean) => void;
  showStreakBadge?: boolean;
  onToggleStreakBadge?: (enabled: boolean) => void;
  showFocusModeButton?: boolean;
  onToggleShowFocusModeButton?: (enabled: boolean) => void;
  isCalSyncConnected: boolean;
  onConnectGCal: () => void;
  calSyncEnabled: boolean;
  onToggleCalSync: (enabled: boolean) => void;
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
  devToolsEnabled,
  onToggleDevTools,
  showStreakBadge = true,
  onToggleStreakBadge,
  showFocusModeButton = true,
  onToggleShowFocusModeButton,
  isCalSyncConnected,
  onConnectGCal,
  calSyncEnabled,
  onToggleCalSync,
  onOpenPwaModal,
  onOpenGuide,
  darkMode,
  onToggleDarkMode,
  themeMode = 'light',
  isDarkEffective = false,
  onChangeThemeMode,
  lang,
  onToggleLang
}) => {
  const [soundEnabled, setSoundEnabled] = useState(() => soundManager.isEnabled());
  const [birthDateInput, setBirthDateInput] = useState(userBirthDate);
  const [ageOptInput, setAgeOptInput] = useState<AgeDisplayOpt>(ageDisplayOpt);
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactStatus, setContactStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSending, setIsSending] = useState(false);

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

  const handleSaveAgeSettings = () => {
    onSaveAge(birthDateInput, ageOptInput);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail.trim() || !contactMessage.trim()) return;

    const CONTACT_COOLDOWN_MS = 60 * 1000;
    const lastSendTs = parseInt(localStorage.getItem('lastContactSendTs') || '0', 10);
    const msSinceLastSend = Date.now() - lastSendTs;

    if (msSinceLastSend < CONTACT_COOLDOWN_MS) {
      const waitSec = Math.ceil((CONTACT_COOLDOWN_MS - msSinceLastSend) / 1000);
      setContactStatus({
        type: 'error',
        message:
          lang === 'ar'
            ? `يرجى الانتظار ${waitSec} ثانية قبل إرسال رسالة أخرى.`
            : `Please wait ${waitSec} seconds before sending another message.`
      });
      return;
    }

    setIsSending(true);
    localStorage.setItem('lastContactSendTs', String(Date.now()));

    try {
      await emailjs.send(
        'service_bt4mtzr',
        'template_hk89o2i',
        {
          name: contactEmail.split('@')[0],
          email: contactEmail,
          message: contactMessage,
          title: lang === 'ar' ? 'رسالة دعم من تطبيق سجل الوقت' : 'Support message from Time Log'
        },
        'U3YIVSY5kZ8NUz4GK'
      );

      setContactStatus({
        type: 'success',
        message: lang === 'ar' ? 'تم إرسال رسالتك بنجاح ✅' : 'Your message has been sent successfully ✅'
      });
      setContactMessage('');
    } catch {
      setContactStatus({
        type: 'error',
        message:
          lang === 'ar'
            ? 'تعذر إرسال الرسالة، يرجى المحاولة لاحقاً.'
            : 'Could not send the message, please try again later.'
      });
    } finally {
      setIsSending(false);
    }
  };

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            {/* Focus Mode Button Toggle */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[var(--ink)] block">{t.focusModeLabel}</h4>
                  <span className="text-[11px] text-[var(--ink-soft)]">
                    {showFocusModeButton ? (lang === 'ar' ? 'مفعل (يظهر بجانب التايمر)' : 'Visible') : (lang === 'ar' ? 'معطل (مخفي)' : 'Hidden')}
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

            {/* Compact Age & Birthday Settings Card */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex flex-col justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-500 shrink-0">
                  <Cake className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs text-[var(--ink)] block truncate">{t.ageSectionTitle}</h4>
                  <span className="text-[11px] text-[var(--ink-soft)] block truncate">
                    {birthDateInput
                      ? (ageOptInput === 'years'
                          ? (lang === 'ar' ? 'عرض بالسنين مفعل' : 'Age in years active')
                          : ageOptInput === 'days'
                          ? (lang === 'ar' ? 'عرض بالأيام مفعل' : 'Age in days active')
                          : (lang === 'ar' ? 'تنبيهات أعياد الميلاد فقط' : 'Birthday alerts only'))
                      : (lang === 'ar' ? 'حدد تاريخ ميلادك' : 'Set birth date')}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--line)] flex items-center gap-1.5">
                <input
                  type="date"
                  value={birthDateInput}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setBirthDateInput(newDate);
                    onSaveAge(newDate, ageOptInput);
                  }}
                  className="flex-1 min-w-0 bg-[var(--card)] border border-[var(--line)] rounded-lg px-2 py-1 text-xs text-[var(--ink)] focus:outline-none focus:border-indigo-500 font-mono"
                  title={t.lblBirthDate}
                />

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

            {/* Google Calendar Sync Card (Toggle + Connect Button) */}
            <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[var(--ink)] block">{lang === 'ar' ? 'ربط تقويم جوجل' : 'Google Calendar'}</h4>
                  <span className="text-[11px] text-[var(--ink-soft)]">
                    {isCalSyncConnected ? (lang === 'ar' ? 'متصل ✓' : 'Connected ✓') : (lang === 'ar' ? 'غير متصل' : 'Disconnected')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onConnectGCal}
                  className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-all shadow-xs cursor-pointer ${
                    isCalSyncConnected
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {isCalSyncConnected ? (lang === 'ar' ? 'متصل' : 'Connected') : (lang === 'ar' ? 'ربط الحساب' : 'Connect')}
                </button>
                <label className="relative inline-flex items-center cursor-pointer">
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
          </div>

          {/* Contact & Support Section */}
          <div className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-4 flex flex-col gap-3.5 shadow-xs">
            <form onSubmit={handleContactSubmit} className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[var(--ink)]">{t.contactSectionTitle}</h4>
                  <p className="text-xs text-[var(--ink-soft)] leading-relaxed mt-0.5">
                    {lang === 'ar'
                      ? 'أرسل لنا اقتراحك أو استفسارك وسيتم الرد عليك في أسرع وقت'
                      : 'Send us feedback or inquiries and we will respond promptly'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-3 border-t border-[var(--line)]">
                <div>
                  <label className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">
                    {t.lblContactEmail}
                  </label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder={t.contactEmailPlaceholder}
                    className="w-full bg-[var(--card)] border border-[var(--line)] rounded-xl px-3 py-2 text-xs text-[var(--ink)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">
                    {t.lblContactMessage}
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder={t.contactMessagePlaceholder}
                    className="w-full bg-[var(--card)] border border-[var(--line)] rounded-xl px-3 py-2 text-xs text-[var(--ink)] focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                {contactStatus && (
                  <div
                    className={`p-2.5 rounded-xl flex items-center gap-2 font-medium text-xs ${
                      contactStatus.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                    }`}
                  >
                    {contactStatus.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{contactStatus.message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>{isSending ? (lang === 'ar' ? 'جاري الإرسال...' : 'Sending...') : t.btnSendContactText}</span>
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
            <span className="font-mono font-bold text-[10px] text-indigo-600 dark:text-indigo-400">v3.8</span>
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
