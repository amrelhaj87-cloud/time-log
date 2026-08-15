import React, { useState } from 'react';
import { TagCode } from '../../types';
import { STRINGS } from '../../constants/config';
import { TagPicker } from '../TagPicker';
import { X, Timer, Check } from 'lucide-react';

interface TimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  timerRange: { start: Date; end: Date } | null;
  onSave: (description: string, tag: TagCode) => void;
  hideSleepTag?: boolean;
  lang: 'ar' | 'en';
}

export const TimerModal: React.FC<TimerModalProps> = ({
  isOpen,
  onClose,
  timerRange,
  onSave,
  hideSleepTag = false,
  lang
}) => {
  const [description, setDescription] = useState('');
  const [selectedTag, setSelectedTag] = useState<TagCode>('');
  const t = STRINGS[lang];

  if (!isOpen || !timerRange) return null;

  const fmt = (d: Date) =>
    d.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

  const rangeText =
    lang === 'ar'
      ? `من ${fmt(timerRange.start)} إلى ${fmt(timerRange.end)}`
      : `From ${fmt(timerRange.start)} to ${fmt(timerRange.end)}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    onSave(description.trim(), selectedTag);
    setDescription('');
    setSelectedTag('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-[var(--card)] border border-[var(--line)] rounded-3xl p-4 md:p-6 w-full max-w-md shadow-2xl flex flex-col gap-3 relative animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
          <div className="flex items-center gap-2 font-brand font-bold text-xl text-[var(--teal-dark)]">
            <Timer className="w-5 h-5 text-[var(--teal)]" />
            <span>{t.timerModalTitle}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--ink-soft)] hover:text-rose-500 p-1 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-[var(--ink-soft)] font-bold">
          ⏱️ {rangeText}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              required
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const tagBtn = document.getElementById('tag-picker-btn-timer');
                  if (tagBtn) {
                    tagBtn.click();
                  }
                }
              }}
              placeholder={lang === 'ar' ? 'مثلاً: إنهاء تقرير العمل ومراجعة الأهداف...' : 'e.g., Finished work report and reviewed goals...'}
              className="flex-1 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)] outline-hidden focus:border-[var(--teal)]"
            />

            <TagPicker
              buttonId="tag-picker-btn-timer"
              currentTag={selectedTag}
              onSelect={(tag) => setSelectedTag(tag)}
              hideSleepTag={hideSleepTag}
              lang={lang}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-[var(--line)]">
            <button
              type="submit"
              className="bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t.timerSaveBtnText}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

