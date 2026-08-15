import React, { useState, useEffect } from 'react';
import { AgeDisplayOpt } from '../../types';
import { STRINGS } from '../../constants/config';
import { X, Cake, Check } from 'lucide-react';

interface AgeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBirthDate: string;
  ageDisplayOpt: AgeDisplayOpt;
  onSave: (birthDate: string, opt: AgeDisplayOpt) => void;
  lang: 'ar' | 'en';
}

export const AgeSettingsModal: React.FC<AgeSettingsModalProps> = ({
  isOpen,
  onClose,
  userBirthDate,
  ageDisplayOpt,
  onSave,
  lang
}) => {
  const [birthDate, setBirthDate] = useState(userBirthDate);
  const [opt, setOpt] = useState<AgeDisplayOpt>(ageDisplayOpt);

  const t = STRINGS[lang];

  useEffect(() => {
    setBirthDate(userBirthDate);
    setOpt(ageDisplayOpt);
  }, [userBirthDate, ageDisplayOpt, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(birthDate, opt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-[var(--card)] border border-[var(--line)] rounded-3xl p-4 md:p-6 w-full max-w-md shadow-2xl flex flex-col gap-3 relative animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
          <div className="flex items-center gap-2 font-brand font-bold text-xl text-[var(--teal-dark)]">
            <Cake className="w-5 h-5 text-rose-500" />
            <span>{t.ageModalTitle}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--ink-soft)] hover:text-rose-500 p-1 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-3 py-2 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-[var(--ink-soft)] mb-1">
              {t.lblBirthDate}
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)] outline-hidden focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--ink-soft)] mb-1.5">
              {t.lblDisplayOption}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOpt(opt === 'years' ? 'none' : 'years')}
                className={`p-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                  opt === 'years'
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-[var(--line)] bg-[var(--bg)] hover:border-indigo-400 text-[var(--ink-soft)] hover:text-[var(--ink)]'
                }`}
              >
                <span>🎂</span>
                <span>{t.optYears}</span>
              </button>

              <button
                type="button"
                onClick={() => setOpt(opt === 'days' ? 'none' : 'days')}
                className={`p-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                  opt === 'days'
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-[var(--line)] bg-[var(--bg)] hover:border-indigo-400 text-[var(--ink-soft)] hover:text-[var(--ink)]'
                }`}
              >
                <span>⏳</span>
                <span>{t.optDays}</span>
              </button>
            </div>
          </div>

          <p className="text-[10px] text-[var(--ink-soft)] leading-normal mt-0.5">
            {t.ageDefaultHint}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2 border-t border-[var(--line)]">
          <button
            type="button"
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t.txtSaveAge}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
