import React from 'react';
import { TagCode, TagTargets } from '../../types';
import { TAGS_CONFIG, STRINGS, DAY_NAMES, MONTH_NAMES } from '../../constants/config';
import { X, PieChart } from 'lucide-react';

interface DayDistModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  tagCounts: Record<TagCode, number>;
  unassignedCount: number;
  emptyCount: number;
  totalSlots: number;
  loggedTotal: number;
  hideSleepTag?: boolean;
  tagTargets?: TagTargets;
  lang: 'ar' | 'en';
}

export const DayDistModal: React.FC<DayDistModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  tagCounts,
  unassignedCount,
  emptyCount,
  totalSlots,
  loggedTotal,
  hideSleepTag = false,
  tagTargets,
  lang
}) => {
  const t = STRINGS[lang];

  if (!isOpen) return null;

  const dayName = DAY_NAMES[lang][currentDate.getDay()];
  const monthName = MONTH_NAMES[lang][currentDate.getMonth()];
  const dateTitle = `${dayName}، ${currentDate.getDate()} ${monthName} ${currentDate.getFullYear()}`;

  const allCategories: Array<{ key: string; label: string; count: number; color: string }> = [
    { key: 'E', label: TAGS_CONFIG.E.fullTitle[lang], count: tagCounts.E || 0, color: TAGS_CONFIG.E.color },
    { key: 'V', label: TAGS_CONFIG.V.fullTitle[lang], count: tagCounts.V || 0, color: TAGS_CONFIG.V.color },
    { key: 'R', label: TAGS_CONFIG.R.fullTitle[lang], count: tagCounts.R || 0, color: TAGS_CONFIG.R.color },
    { key: 'S', label: TAGS_CONFIG.S.fullTitle[lang], count: tagCounts.S || 0, color: TAGS_CONFIG.S.color },
    { key: 'SC', label: TAGS_CONFIG.SC.fullTitle[lang], count: tagCounts.SC || 0, color: TAGS_CONFIG.SC.color },
    { key: 'SL', label: TAGS_CONFIG.SL.fullTitle[lang], count: tagCounts.SL || 0, color: TAGS_CONFIG.SL.color },
    { key: 'unassigned', label: lang === 'ar' ? 'بدون تصنيف' : 'Unassigned', count: unassignedCount, color: 'var(--ink-faint)' },
    { key: 'empty', label: lang === 'ar' ? 'ساعات فارغة' : 'Empty Hours', count: emptyCount, color: 'var(--line)' }
  ];

  const categories = allCategories.filter((cat) => {
    if (cat.key === 'SL' && hideSleepTag && cat.count === 0) return false;
    return true;
  });

  const size = 180;
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  let offset = 0;
  const segments = categories.map((cat) => {
    const dashLen = totalSlots > 0 ? (cat.count / totalSlots) * circ : 0;
    const currentOffset = offset;
    offset += dashLen;
    return {
      ...cat,
      dashLen,
      offset: currentOffset,
      pct: totalSlots > 0 ? ((cat.count / totalSlots) * 100).toFixed(1) : '0'
    };
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-[var(--card)] border border-[var(--line)] rounded-3xl p-4 md:p-6 w-full max-w-lg shadow-2xl flex flex-col gap-3 relative animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
          <div className="flex items-center gap-2 font-brand font-bold text-xl text-[var(--teal-dark)]">
            <PieChart className="w-5 h-5 text-[var(--teal)]" />
            <span>{t.dayDistModalTitle}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--ink-soft)] hover:text-rose-500 p-1 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center text-xs font-bold text-[var(--ink-soft)]">
          {dateTitle}
        </div>

        {/* Donut Chart & Legend */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
          {/* Chart SVG */}
          <div className="relative w-[180px] h-[180px] shrink-0">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth="18" opacity="0.3" />
              {segments.map((seg) => {
                if (seg.dashLen <= 0.01) return null;
                return (
                  <circle
                    key={seg.key}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="18"
                    strokeDasharray={`${seg.dashLen} ${circ - seg.dashLen}`}
                    strokeDashoffset={-seg.offset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                  />
                );
              })}
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="font-extrabold text-2xl font-mono text-[var(--teal-dark)] leading-tight">
                {loggedTotal}
              </span>
              <span className="text-[10px] font-bold text-[var(--ink-soft)]">
                /{totalSlots} {lang === 'ar' ? 'ساعة' : 'hrs'}
              </span>
            </div>
          </div>

          {/* Legend Items */}
          <div className="flex flex-col gap-1.5 min-w-[160px] text-xs font-semibold flex-1">
            {segments.map((seg) => {
              const targetQuota = tagTargets && seg.key in tagTargets
                ? tagTargets[seg.key as keyof TagTargets]
                : undefined;
              const quotaPct = targetQuota && targetQuota > 0
                ? Math.round((seg.count / targetQuota) * 100)
                : undefined;

              return (
                <div key={seg.key} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-md shrink-0 border border-black/5"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="truncate">{seg.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-[11px] text-[var(--ink)] font-bold">
                        {seg.count}h
                      </span>
                      {targetQuota !== undefined && (
                        <span className="text-[10px] font-mono text-[var(--ink-soft)] bg-[var(--bg)] px-1 py-0.2 rounded border border-[var(--line)]">
                          {quotaPct}% {lang === 'ar' ? 'من الهدف' : 'of goal'}
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-[var(--ink-faint)]">
                        ({seg.pct}%)
                      </span>
                    </div>
                  </div>
                  {targetQuota !== undefined && targetQuota > 0 && (
                    <div className="w-full bg-[var(--line)]/50 h-1 rounded-full overflow-hidden ms-5 max-w-[calc(100%-20px)]">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (seg.count / targetQuota) * 100)}%`,
                          backgroundColor: seg.color
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
