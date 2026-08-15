import React, { useState } from 'react';
import { TagCode } from '../types';
import { TAGS_CONFIG, TAG_CODES_ORDER, STRINGS } from '../constants/config';

interface TagLegendProps {
  lang: 'ar' | 'en';
  hideSleepTag?: boolean;
}

export const TagLegend: React.FC<TagLegendProps> = ({ lang, hideSleepTag = false }) => {
  const [activeTooltip, setActiveTooltip] = useState<TagCode | null>(null);
  const t = STRINGS[lang];

  const visibleCodes = (TAG_CODES_ORDER.filter((c) => c !== '') as TagCode[]).filter(
    (c) => !hideSleepTag || c !== 'SL'
  );

  return (
    <div className="bg-[var(--card)] border border-[var(--line)] rounded-xl p-3 shadow-xs flex flex-col items-center gap-2 my-2">
      <span className="text-[11px] font-semibold text-[var(--ink-soft)] text-center">
        {t.tagLegendTitle}
      </span>

      <div className="flex flex-wrap justify-center gap-1.5">
        {visibleCodes.map((code) => {
          const info = TAGS_CONFIG[code];
          const isTooltipVisible = activeTooltip === code;

          return (
            <div
              key={code}
              onClick={() => setActiveTooltip(isTooltipVisible ? null : code)}
              onMouseEnter={() => setActiveTooltip(code)}
              onMouseLeave={() => setActiveTooltip(null)}
              className="relative cursor-pointer select-none"
            >
              <span
                className="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all duration-150 inline-flex items-center gap-1 shadow-xs hover:scale-105"
                style={{
                  backgroundColor: info.bgTint,
                  color: info.color,
                  borderColor: info.color
                }}
              >
                <span>{info.fullTitle[lang]}</span>
              </span>

              {/* Tooltip */}
              {isTooltipVisible && (
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[220px] bg-slate-900 text-white text-[10px] font-medium py-1.5 px-2.5 rounded-lg shadow-xl z-50 text-center leading-relaxed animate-in fade-in"
                  style={{
                    direction: lang === 'ar' ? 'rtl' : 'ltr'
                  }}
                >
                  {info.desc[lang]}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
