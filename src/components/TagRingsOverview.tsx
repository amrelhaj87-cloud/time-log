import React from 'react';
import { TagCode, TagTargets } from '../types';
import { TAGS_CONFIG } from '../constants/config';

interface TagRingsOverviewProps {
  tagCounts: Record<TagCode, number>;
  totalSlots: number;
  onOpenCharts: () => void;
  lang: 'ar' | 'en';
  hideSleepTag?: boolean;
  tagTargets?: TagTargets;
}

export const TagRingsOverview: React.FC<TagRingsOverviewProps> = ({
  tagCounts = { E: 0, V: 0, R: 0, S: 0, SC: 0, SL: 0, '': 0 },
  totalSlots = 1,
  onOpenCharts,
  lang = 'ar',
  hideSleepTag = false,
  tagTargets
}) => {
  const allCodes: TagCode[] = ['E', 'V', 'R', 'S', 'SC', 'SL'];
  const codes = allCodes.filter((c) => !hideSleepTag || c !== 'SL');

  // SVG parameters for larger, clearer rings
  const tr = 17;
  const tcx = 22;
  const tcy = 22;
  const tcirc = 2 * Math.PI * tr;

  return (
    <div
      onClick={onOpenCharts}
      className="bg-[var(--card)] border border-[var(--line)] rounded-xl p-3 sm:p-3.5 shadow-xs flex items-center justify-around gap-1.5 sm:gap-2 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-sm transition-all group select-none"
      title={lang === 'ar' ? 'انقر لعرض الإحصائيات الشاملة' : 'Click to view full statistics'}
    >
      {codes.map((code) => {
        const info = TAGS_CONFIG[code];
        if (!info) return null;
        const count = tagCounts?.[code] || 0;
        const targetQuota = tagTargets && code !== 'SL' && code !== '' ? tagTargets[code as keyof TagTargets] : undefined;
        const denominator = targetQuota && targetQuota > 0 ? targetQuota : totalSlots;
        const pct = denominator > 0 ? count / denominator : 0;
        const offset = tcirc * (1 - Math.min(pct, 1));

        const tooltip = targetQuota !== undefined
          ? `${info.fullTitle[lang]} (${count}h / ${lang === 'ar' ? 'الهدف' : 'Target'}: ${targetQuota}h)`
          : info.fullTitle[lang];

        return (
          <div
            key={code}
            className="flex flex-col items-center justify-center gap-1.5 flex-1 transition-transform duration-150 group-hover:scale-105"
            title={tooltip}
          >
            {/* Bigger & Clearer Circular Progress Ring */}
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center">
              <svg className="w-full h-full drop-shadow-2xs" viewBox="0 0 44 44">
                {/* Background Ring */}
                <circle
                  cx={tcx}
                  cy={tcy}
                  r={tr}
                  fill="none"
                  stroke="var(--line)"
                  strokeWidth="3.5"
                  className="opacity-80 dark:opacity-40"
                />
                {/* Active Tag Progress Ring */}
                {count > 0 && (
                  <circle
                    cx={tcx}
                    cy={tcy}
                    r={tr}
                    fill="none"
                    stroke={info.color}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    strokeDasharray={tcirc}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 ${tcx} ${tcy})`}
                    className="transition-all duration-300"
                  />
                )}
              </svg>
              {/* Number Count in the Center */}
              <span
                className="absolute font-mono text-xs sm:text-[13px] font-black"
                style={{ color: count > 0 ? info.color : 'var(--ink-soft)' }}
              >
                {count}
              </span>
            </div>

            {/* Tag Label Badge */}
            <span
              className="text-[11px] font-black tracking-wider px-1.5 py-0.5 rounded-md transition-colors"
              style={{
                color: count > 0 ? info.color : 'var(--ink-soft)',
                backgroundColor: count > 0 ? info.bgTint : 'transparent'
              }}
            >
              {code}
            </span>
          </div>
        );
      })}
    </div>
  );
};
