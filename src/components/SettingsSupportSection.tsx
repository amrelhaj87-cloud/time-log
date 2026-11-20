import React, { useState } from 'react';
import { SleepSettings } from '../types';
import { STRINGS } from '../constants/config';
import KofiButton from './KofiButton';
import {
  Settings,
  ChevronDown,
  ChevronUp,
  Moon,
  Cake,
  Calendar,
  Smartphone,
  BookOpen,
  Mail
} from 'lucide-react';

interface SettingsSupportSectionProps {
  sleepSettings: SleepSettings;
  onChangeSleepSettings: (settings: SleepSettings) => void;
  onOpenAgeModal: () => void;
  devToolsEnabled: boolean;
  onToggleDevTools: (enabled: boolean) => void;
  isCalSyncConnected: boolean;
  onConnectGCal: () => void;
  calSyncEnabled: boolean;
  onToggleCalSync: (enabled: boolean) => void;
  onOpenPwaModal: () => void;
  lang: 'ar' | 'en';
}

export const SettingsSupportSection: React.FC<SettingsSupportSectionProps> = ({
  sleepSettings,
  onChangeSleepSettings,
  onOpenAgeModal,
  devToolsEnabled,
  onToggleDevTools,
  isCalSyncConnected,
  onConnectGCal,
  calSyncEnabled,
  onToggleCalSync,
  onOpenPwaModal,
  lang
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const t = STRINGS[lang];

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
    <section className="bg-[var(--card)] border border-[var(--line)] rounded-xl p-3.5 md:p-4 shadow-xs mt-3.5">
      {/* Accordion Toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-xs font-bold text-[var(--ink)]"
      >
        <span className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>{t.settingsSupportToggleText}</span>
        </span>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--ink-soft)]" /> : <ChevronDown className="w-4 h-4 text-[var(--ink-soft)]" />}
      </button>

      {/* Accordion Body */}
      {isExpanded && (
        <div className="flex flex-col gap-3.5 mt-3.5 pt-3 border-t border-[var(--line)] text-xs">
          {/* 1. Sleep Window Settings */}
          <div className="bg-[var(--sleep-block-bg)] border border-[var(--sleep-block-border)] rounded-xl p-3 flex flex-col gap-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="font-bold text-[var(--ink)]">
                  {t.sleepSettingsTitle}
                </span>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  sleepSettings.enabled
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                }`}
              >
                {sleepSettings.enabled ? t.sleepStatusActive : t.sleepStatusInactive}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sleepSettings.enabled}
                  onChange={(e) =>
                    onChangeSleepSettings({ ...sleepSettings, enabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded-md accent-indigo-600"
                />
                <span className="font-semibold">{lang === 'ar' ? 'تفعيل نافذة النوم' : 'Enable Sleep Window'}</span>
              </label>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[var(--ink-soft)] font-medium">
                  {lang === 'ar' ? 'من:' : 'From:'}
                </span>
                <select
                  value={sleepSettings.start}
                  onChange={(e) =>
                    onChangeSleepSettings({
                      ...sleepSettings,
                      start: parseInt(e.target.value, 10)
                    })
                  }
                  className="bg-[var(--card)] border border-[var(--line)] rounded-lg px-2 py-1 text-xs text-[var(--ink)] focus:border-indigo-500 outline-hidden"
                >
                  {hourOptions.map((opt) => (
                    <option key={`start-${opt.value}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[var(--ink-soft)] font-medium">
                  {lang === 'ar' ? 'إلى:' : 'To:'}
                </span>
                <select
                  value={sleepSettings.end}
                  onChange={(e) =>
                    onChangeSleepSettings({
                      ...sleepSettings,
                      end: parseInt(e.target.value, 10)
                    })
                  }
                  className="bg-[var(--card)] border border-[var(--line)] rounded-lg px-2 py-1 text-xs text-[var(--ink)] focus:border-indigo-500 outline-hidden"
                >
                  {hourOptions.map((opt) => (
                    <option key={`end-${opt.value}`} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-[11px] font-medium text-[var(--ink-soft)] flex items-center gap-2">
              <span>
                ⏱️ {t.sleepHoursLabel}: <b>{sleepHours}</b>h
              </span>
              <span>—</span>
              <span>
                ☀️ {t.activeHoursLabel}: <b>{activeHours}</b>h
              </span>
            </div>
          </div>

          {/* 2. Birthday & Age Calculator */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)]">
            <div>
              <div className="font-bold text-[var(--ink)] flex items-center gap-1.5">
                <Cake className="w-3.5 h-3.5 text-rose-500" />
                <span>{t.ageSettingsTitle}</span>
              </div>
              <div className="text-[10px] text-[var(--ink-soft)]">
                {t.ageSettingsSub}
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenAgeModal}
              className="bg-[var(--card)] hover:bg-slate-100 dark:hover:bg-slate-700 border border-[var(--line)] text-[var(--ink)] px-3 py-1 rounded-lg font-medium transition-all shadow-xs"
            >
              {t.ageBtnText}
            </button>
          </div>

          {/* 3. Advanced Tools Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)]">
            <div>
              <div className="font-bold text-[var(--ink)] flex items-center gap-1.5">
                <span>⚙️</span>
                <span>{t.devToolsSectionTitle}</span>
              </div>
              <div className="text-[10px] text-[var(--ink-soft)]">
                {t.devToolsSectionSub}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={devToolsEnabled}
                onChange={(e) => onToggleDevTools(e.target.checked)}
                className="w-4 h-4 rounded-md accent-indigo-600"
              />
              <span className="font-semibold">{lang === 'ar' ? 'تفعيل' : 'Enable'}</span>
            </label>
          </div>

          {/* 4. Google Calendar Integration */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)]">
            <div>
              <div className="font-bold text-[var(--ink)] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{t.calSyncTitle}</span>
              </div>
              <div className="text-[10px] text-[var(--ink-soft)]">
                {t.calSyncSub}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onConnectGCal}
                className={`px-3 py-1 rounded-lg font-medium border transition-all text-[11px] shadow-xs ${
                  isCalSyncConnected
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300'
                    : 'bg-[var(--card)] text-[var(--ink)] border-[var(--line)] hover:border-indigo-400'
                }`}
              >
                {isCalSyncConnected ? t.txtGCalConnected : t.txtConnectGCal}
              </button>
              <label className="flex items-center gap-1 text-[11px] font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={calSyncEnabled}
                  onChange={(e) => onToggleCalSync(e.target.checked)}
                  className="w-3.5 h-3.5 rounded-md accent-indigo-600"
                />
                <span>{lang === 'ar' ? 'اقتراح' : 'Suggest'}</span>
              </label>
            </div>
          </div>

          {/* 5. PWA Install & Guide Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] flex items-center justify-between gap-2">
              <div>
                <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{t.appInstallSectionTitle}</span>
                </div>
                <div className="text-[10px] text-[var(--ink-soft)]">
                  {t.appInstallSectionSub}
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenPwaModal}
                className="bg-[var(--card)] hover:bg-amber-600 hover:text-white border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-lg font-medium transition-all text-xs shrink-0 shadow-xs"
              >
                {t.pwaInstallBtn}
              </button>
            </div>

            <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] flex items-center justify-between gap-2">
              <div>
                <div className="font-bold text-[var(--ink)] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{t.guideSettingsLabel}</span>
                </div>
                <div className="text-[10px] text-[var(--ink-soft)]">
                  {t.guideSettingsSub}
                </div>
              </div>
              <a
                href="/guide"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[var(--card)] hover:bg-indigo-600 hover:text-white border border-[var(--line)] hover:border-indigo-600 text-[var(--ink)] px-3 py-1 rounded-lg font-medium transition-all text-xs shrink-0 shadow-xs inline-flex items-center gap-1"
              >
                {t.txtGuideSettingsBtn}
              </a>
            </div>
          </div>

          {/* 6. Ko-fi Support */}
          <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">☕</span>
              <div>
                <div className="font-bold text-xs text-[var(--ink)]">
                  {lang === 'ar' ? 'ادعم استمرار وتطوير التطبيق' : 'Support on Ko-fi'}
                </div>
                <div className="text-[10px] text-[var(--ink-soft)]">
                  {lang === 'ar' ? 'مساهمتك تساعدنا على التطوير المستمر' : 'Your support helps us keep improving'}
                </div>
              </div>
            </div>
            <KofiButton username="zerocold" />
          </div>

          {/* 7. Contact & Support Message Form */}
          <div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] flex flex-col gap-2.5 shadow-xs">
            <div className="font-bold text-[var(--ink)] flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-indigo-600" />
              <span>{t.contactSectionTitle}</span>
            </div>

            <form
              action="https://formsubmit.co/amr.elhaj87@gmail.com"
              method="POST"
              className="flex flex-col gap-2"
            >
              <input type="hidden" name="_subject" value="[سجل الوقت] رسالة جديدة" />

              <div>
                <label className="block text-[10px] font-semibold text-[var(--ink-soft)] mb-0.5">
                  {lang === 'ar' ? 'الاسم (اختياري):' : 'Name (optional):'}
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder={lang === 'ar' ? 'اسمك الكريم...' : 'Your name...'}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--card)] text-xs text-[var(--ink)] outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[var(--ink-soft)] mb-0.5">
                  {t.lblContactEmail}
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder={t.contactEmailPlaceholder}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--card)] text-xs text-[var(--ink)] outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[var(--ink-soft)] mb-0.5">
                  {t.lblContactMessage}
                </label>
                <textarea
                  name="message"
                  required
                  rows={2}
                  placeholder={t.contactMessagePlaceholder}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--card)] text-xs text-[var(--ink)] outline-hidden focus:border-indigo-500 resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="submit"
                  className="ms-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg font-semibold transition-all text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{t.btnSendContactText}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
