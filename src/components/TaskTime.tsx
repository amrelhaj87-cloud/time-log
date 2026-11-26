import React, { useEffect, useRef, useState } from 'react';
import { ESTIMATE_PRESETS, formatMins, progressPct } from '../utils/focusTasks';

/**
 * Time estimate + progress UI for tasks linked to the Pomodoro (#48):
 * - EstimatePicker: chips "none / 30m / 1h / 2h / custom".
 * - TaskTimeBadge: "⏱ 45m / 2h · 38%" with a thin bar; clicking it (when
 *   `onSetEstimate` is given) opens the picker to set or change the estimate.
 */

interface EstimatePickerProps {
  value?: number;
  onChange: (mins: number | undefined) => void;
  lang: 'ar' | 'en';
  /** Show the "none" chip (default true). */
  allowNone?: boolean;
}

export const EstimatePicker: React.FC<EstimatePickerProps> = ({ value, onChange, lang, allowNone = true }) => {
  const isCustom = value !== undefined && !ESTIMATE_PRESETS.includes(value);
  const [editingCustom, setEditingCustom] = useState(false);
  const [customInput, setCustomInput] = useState(isCustom && value ? String(value) : '90');

  const chip = (active: boolean) =>
    `px-2 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
      active
        ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
        : 'bg-[var(--card)] border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:border-indigo-400'
    }`;

  const applyCustom = () => {
    const n = parseInt(customInput.trim(), 10);
    if (!isNaN(n) && n >= 5 && n <= 6000) onChange(n);
    setEditingCustom(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {allowNone && (
        <button type="button" className={chip(value === undefined)} onClick={() => onChange(undefined)}>
          {lang === 'ar' ? 'بدون' : 'None'}
        </button>
      )}
      {ESTIMATE_PRESETS.map((m) => (
        <button key={m} type="button" className={chip(value === m)} onClick={() => onChange(m)}>
          {formatMins(m, lang)}
        </button>
      ))}
      {editingCustom ? (
        <span className="inline-flex items-center gap-1">
          <input
            type="number"
            min={5}
            max={6000}
            autoFocus
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                applyCustom();
              } else if (e.key === 'Escape') {
                setEditingCustom(false);
              }
            }}
            className="w-16 px-1.5 py-1 rounded-lg border border-indigo-400 bg-[var(--bg)] text-[var(--ink)] text-[11px] font-mono outline-hidden"
            aria-label={lang === 'ar' ? 'الزمن بالدقائق' : 'Minutes'}
          />
          <span className="text-[10px] text-[var(--ink-soft)]">{lang === 'ar' ? 'دقيقة' : 'min'}</span>
          <button type="button" className={chip(true)} onClick={applyCustom}>
            ✓
          </button>
        </span>
      ) : (
        <button type="button" className={chip(isCustom)} onClick={() => setEditingCustom(true)}>
          {isCustom && value ? formatMins(value, lang) : lang === 'ar' ? 'مخصص…' : 'Custom…'}
        </button>
      )}
    </div>
  );
};

interface TaskTimeBadgeProps {
  spentMins?: number;
  estimateMins?: number;
  lang: 'ar' | 'en';
  onSetEstimate?: (mins: number | undefined) => void;
  /** Show a small "set time" button even when there is nothing to show yet. */
  showWhenEmpty?: boolean;
  className?: string;
}

export const TaskTimeBadge: React.FC<TaskTimeBadgeProps> = ({
  spentMins,
  estimateMins,
  lang,
  onSetEstimate,
  showWhenEmpty = false,
  className = ''
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]);

  const spent = spentMins ?? 0;
  const pct = progressPct(spent, estimateMins);
  const isEmpty = spent === 0 && !estimateMins;
  if (isEmpty && !(showWhenEmpty && onSetEstimate)) return null;

  const over = pct !== null && pct > 100;
  const barColor = over ? 'bg-orange-500' : pct !== null && pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500';

  const label = isEmpty
    ? lang === 'ar'
      ? '⏱ حدّد الوقت'
      : '⏱ Set time'
    : estimateMins
      ? `⏱ ${formatMins(spent, lang)} ${lang === 'ar' ? 'من' : '/'} ${formatMins(estimateMins, lang)}`
      : `⏱ ${formatMins(spent, lang)}`;

  const title = lang === 'ar' ? 'الوقت المصروف / المتوقع — اضغط لتعديل الوقت المتوقع' : 'Time spent / estimate — click to change the estimate';

  const content = (
    <>
      <span>{label}</span>
      {pct !== null && (
        <>
          <span className={`font-black ${over ? 'text-orange-600 dark:text-orange-400' : ''}`}>· {pct}%</span>
          <span className="w-10 h-1 rounded-full bg-[var(--line)] overflow-hidden inline-block">
            <span className={`block h-full ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
          </span>
        </>
      )}
    </>
  );

  const baseCls = `inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border border-[var(--line)] bg-[var(--bg)] text-[var(--ink-soft)] whitespace-nowrap ${className}`;

  if (!onSetEstimate) return <span className={baseCls}>{content}</span>;

  return (
    <span ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${baseCls} hover:border-indigo-400 hover:text-[var(--ink)] cursor-pointer transition-colors`}
        title={title}
        aria-expanded={open}
      >
        {content}
      </button>
      {open && (
        <div
          className="absolute z-50 top-full mt-1 start-0 bg-[var(--card)] border border-[var(--line)] rounded-xl p-2 shadow-2xl flex flex-col gap-1.5 w-max max-w-[260px]"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              setOpen(false);
            }
          }}
        >
          <span className="text-[10px] font-bold text-[var(--ink-soft)]">
            {lang === 'ar' ? '⏱ كم تحتاج هذه المهمة من الوقت؟' : '⏱ How long does this need?'}
          </span>
          <EstimatePicker
            value={estimateMins}
            lang={lang}
            onChange={(m) => {
              onSetEstimate(m);
              setOpen(false);
            }}
          />
        </div>
      )}
    </span>
  );
};
