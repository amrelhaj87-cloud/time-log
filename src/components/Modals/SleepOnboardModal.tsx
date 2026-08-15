import React, { useState } from 'react';
import { SleepSettings } from '../../types';
import { STRINGS } from '../../constants/config';
import { X, Moon, Check, FastForward } from 'lucide-react';

interface SleepOnboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (settings: SleepSettings) => void;
  onSkip: () => void;
  lang: 'ar' | 'en';
}

export const SleepOnboardModal: React.FC<SleepOnboardModalProps> = ({
  isOpen,
  onClose,
  onApply,
  onSkip,
  lang
}) => {
  const [start, setStart] = useState(23); // 11pm
  const [end, setEnd] = useState(7);     // 7am

  const t = STRINGS[lang];

  if (!isOpen) return null;

  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${String(i).padStart(2, '0')}:00`
  }));

  const handleApplyPreset = (s: number, e: number) => {
    onApply({
      enabled: true,
      start: s,
      end: e,
      onboarded: true
    });
    onClose();
  };

  const handleCustomApply = () => {
    onApply({
      enabled: true,
      start,
      end,
      onboarded: true
    });
    onClose();
  };

  const handleSkip = () => {
    onSkip();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-[var(--card)] border border-[var(--line)] rounded-3xl p-4 md:p-6 w-full max-w-lg shadow-2xl flex flex-col gap-3 relative animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
          <div className="flex items-center gap-2 font-brand font-bold text-xl text-[var(--teal-dark)]">
            <Moon className="w-5 h-5 text-[var(--teal)]" />
            <span>{t.sleepOnboardTitle}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--ink-soft)] hover:text-rose-500 p-1 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
          {t.sleepOnboardDesc}
        </p>

        {/* Quick Presets */}
        <div className="grid grid-cols-2 gap-2 my-1">
          <button
            type="button"
            onClick={() => handleApplyPreset(23, 7)}
            className="p-3 rounded-2xl border border-[var(--line)] hover:border-[var(--teal)] bg-[var(--bg)] hover:bg-[var(--teal-tint)] transition-all flex flex-col items-center gap-1 text-center shadow-xs"
          >
            <span className="text-sm">🌙</span>
            <span className="font-extrabold text-xs text-[var(--teal-dark)]">11:00 م — 07:00 ص</span>
            <span className="text-[10px] text-[var(--ink-faint)] font-bold">(8 ساعات نوم)</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset(0, 8)}
            className="p-3 rounded-2xl border border-[var(--line)] hover:border-[var(--teal)] bg-[var(--bg)] hover:bg-[var(--teal-tint)] transition-all flex flex-col items-center gap-1 text-center shadow-xs"
          >
            <span className="text-sm">🌙</span>
            <span className="font-extrabold text-xs text-[var(--teal-dark)]">12:00 ص — 08:00 ص</span>
            <span className="text-[10px] text-[var(--ink-faint)] font-bold">(8 ساعات نوم)</span>
          </button>
        </div>

        {/* Custom Hours */}
        <div className="flex items-center justify-center gap-3 p-2 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
          <div className="flex items-center gap-1 text-xs">
            <span className="font-bold text-[var(--ink-soft)]">{lang === 'ar' ? 'بداية:' : 'Start:'}</span>
            <select
              value={start}
              onChange={(e) => setStart(parseInt(e.target.value, 10))}
              className="bg-[var(--card)] border border-[var(--line)] rounded-lg px-2 py-1 text-xs"
            >
              {hourOptions.map((opt) => (
                <option key={`custom-start-${opt.value}`} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <span className="font-bold text-[var(--ink-soft)]">{lang === 'ar' ? 'نهاية:' : 'End:'}</span>
            <select
              value={end}
              onChange={(e) => setEnd(parseInt(e.target.value, 10))}
              className="bg-[var(--card)] border border-[var(--line)] rounded-lg px-2 py-1 text-xs"
            >
              {hourOptions.map((opt) => (
                <option key={`custom-end-${opt.value}`} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line)]">
          <button
            type="button"
            onClick={handleSkip}
            className="text-[var(--ink-faint)] hover:text-[var(--ink)] text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1 transition-all"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>{t.sleepOnboardSkip}</span>
          </button>

          <button
            type="button"
            onClick={handleCustomApply}
            className="bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t.sleepOnboardApply}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
