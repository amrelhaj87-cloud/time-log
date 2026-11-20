import React from 'react';
import { TagCode, TagTargets, DayData } from '../../types';
import { TAGS_CONFIG } from '../../constants/config';
import { Sun, Sparkles, X, ArrowRight } from 'lucide-react';
import { soundManager } from '../../utils/soundEffects';

interface MorningNudgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  yesterdayData: DayData | null;
  tagTargets: TagTargets;
  lang: 'ar' | 'en';
}

export const MorningNudgeModal: React.FC<MorningNudgeModalProps> = ({
  isOpen,
  onClose,
  yesterdayData,
  tagTargets,
  lang
}) => {
  if (!isOpen) return null;

  // Calculate yesterday's logged hours per tag
  const yesterdayCounts: Record<TagCode, number> = { E: 0, V: 0, R: 0, S: 0, SC: 0, SL: 0, '': 0 };
  let yesterdayTotalLogged = 0;

  if (yesterdayData && yesterdayData.hours) {
    Object.values(yesterdayData.hours).forEach((entry) => {
      if (entry && entry.text && entry.text.trim() !== '') {
        yesterdayTotalLogged++;
        if (entry.tag && yesterdayCounts[entry.tag] !== undefined) {
          yesterdayCounts[entry.tag]++;
        }
      }
    });
  }

  // Active tracked codes
  const trackedCodes: Array<'E' | 'V' | 'R' | 'S' | 'SC'> = ['E', 'V', 'R', 'S', 'SC'];

  // Identify top achieved tag vs most deficit tag
  let topTag: 'E' | 'V' | 'R' | 'S' | 'SC' = 'E';
  let maxHours = -1;
  let topDeficitTag: 'E' | 'V' | 'R' | 'S' | 'SC' = 'SC';
  let maxDeficit = -999;

  trackedCodes.forEach((code) => {
    const hours = yesterdayCounts[code] || 0;
    const target = tagTargets[code] || 2;
    const deficit = target - hours;

    if (hours > maxHours) {
      maxHours = hours;
      topTag = code;
    }
    if (deficit > maxDeficit) {
      maxDeficit = deficit;
      topDeficitTag = code;
    }
  });

  const topTagInfo = TAGS_CONFIG[topTag];
  const deficitTagInfo = TAGS_CONFIG[topDeficitTag];

  // Craft dynamic, mindful 1-2 sentence insights
  let messageAr = '';
  let messageEn = '';

  if (yesterdayTotalLogged >= 3) {
    messageAr = `أمس كان تركيزك الأكبر على ${topTagInfo.fullTitle.ar} بمعدل (${maxHours} ساعات) من إجمالي (${yesterdayTotalLogged} ساعات). اليوم فرصة رائعة لمنح مزيد من الاهتمام لـ ${deficitTagInfo.fullTitle.ar} لإعادة التوازن لساعاتك!`;
    messageEn = `Yesterday your greatest focus was on ${topTagInfo.fullTitle.en} (${maxHours} hrs) out of (${yesterdayTotalLogged} hrs logged). Today is a great opportunity to dedicate time to ${deficitTagInfo.fullTitle.en} for better daily balance!`;
  } else if (yesterdayTotalLogged > 0) {
    messageAr = `أمس سجّلت (${yesterdayTotalLogged} ساعات). بداية طيبة ومحفزة، واليوم فرصة ذهبية لمضاعفة ساعات تركيزك ومواصلة إنجاز أهدافك!`;
    messageEn = `Yesterday you logged (${yesterdayTotalLogged} hrs). A solid start, and today is a golden opportunity to expand your focus and achieve your goals!`;
  } else {
    messageAr = `لم يتم رصد ساعات مسجلة لأمس. بداية يومك اليوم فرصة جديدة لتدوين إنجازاتك والاقتراب من أهدافك خطوة بخطوة!`;
    messageEn = `No logged hours were recorded for yesterday. Today is a fresh clean slate to capture your hours and achieve your goals!`;
  }

  const handleDismiss = () => {
    soundManager.playClick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-[var(--card)] border border-[var(--line)] rounded-3xl p-5 md:p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 relative animate-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 shrink-0">
              <Sun className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[var(--ink)] flex items-center gap-1.5">
                <span>{lang === 'ar' ? 'همسة الصباح' : 'Morning Nudge'}</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </h3>
              <span className="text-[11px] text-[var(--ink-soft)] font-medium">
                {lang === 'ar' ? 'نظرة وعي سريعة لبداية يوم متوازن' : 'A quick mindful review for a balanced day'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-[var(--ink-soft)] hover:text-rose-500 p-1.5 rounded-xl transition-all cursor-pointer"
            title={lang === 'ar' ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Content */}
        <div className="bg-[var(--bg)] border border-[var(--line)] rounded-2xl p-4 text-xs sm:text-sm font-semibold leading-relaxed text-[var(--ink)] shadow-2xs">
          {lang === 'ar' ? messageAr : messageEn}
        </div>

        {/* Mini targets snapshot of yesterday */}
        {yesterdayTotalLogged > 0 && (
          <div className="grid grid-cols-5 gap-1 pt-1">
            {trackedCodes.map((code) => {
              const cfg = TAGS_CONFIG[code];
              const logged = yesterdayCounts[code] || 0;
              const target = tagTargets[code] || 2;
              return (
                <div
                  key={code}
                  className="flex flex-col items-center justify-center p-1.5 rounded-xl border border-[var(--line)] bg-[var(--card)] text-center"
                >
                  <span className="text-[10px] font-bold" style={{ color: cfg.color }}>
                    {code}
                  </span>
                  <span className="font-mono text-xs font-black text-[var(--ink)]">
                    {logged}h
                  </span>
                  <span className="text-[9px] text-[var(--ink-faint)]">
                    /{target}h
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 border-t border-[var(--line)] flex justify-end">
          <button
            type="button"
            autoFocus
            onClick={handleDismiss}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            <span>{lang === 'ar' ? 'جاهز للانطلاق اليوم' : "Let's Start Today"}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
};

