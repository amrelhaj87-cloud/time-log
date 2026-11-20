import React from 'react';
import { DayData, SleepSettings } from '../../types';
import { STRINGS, TAGS_CONFIG } from '../../constants/config';
import { X, Sparkles } from 'lucide-react';

interface AiSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  dayData: DayData;
  sleepSettings: SleepSettings;
  activeHoursKeys: string[];
  lang: 'ar' | 'en';
}

export const AiSummaryModal: React.FC<AiSummaryModalProps> = ({
  isOpen,
  onClose,
  dayData,
  sleepSettings,
  activeHoursKeys,
  lang
}) => {
  const t = STRINGS[lang];

  if (!isOpen) return null;

  const filledHours = activeHoursKeys.filter((k) => {
    const hour = dayData.hours[k];
    return hour && hour.text && hour.text.trim() !== '';
  });

  const tagCounts: Record<string, number> = { E: 0, V: 0, R: 0, S: 0, SC: 0, SL: 0 };
  filledHours.forEach((k) => {
    const tag = dayData.hours[k]?.tag;
    if (tag && tagCounts[tag] !== undefined) {
      tagCounts[tag]++;
    }
  });

  const totalFilled = filledHours.length;
  const isGoldenDone = dayData.goldenGoal && dayData.goldenGoal.done;
  const goldenText = dayData.goldenGoal?.text;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-[var(--card)] border border-[var(--line)] rounded-3xl p-4 md:p-6 w-full max-w-lg shadow-2xl flex flex-col gap-3 relative animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
          <div className="flex items-center gap-2 font-brand font-bold text-xl text-[var(--ai-purple)]">
            <Sparkles className="w-5 h-5 text-[var(--amber)]" />
            <span>{t.aiModalTitle}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--ink-soft)] hover:text-rose-500 p-1 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlight Badges */}
        <div className="flex flex-wrap gap-2">
          <span className="bg-[var(--card)] border border-[var(--line)] text-[var(--teal-dark)] text-xs font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5">
            <span>⏱️</span>
            <span>
              {lang === 'ar' ? `ساعات مسجلة: ${totalFilled} من ${activeHoursKeys.length}` : `Logged: ${totalFilled}/${activeHoursKeys.length}`}
            </span>
          </span>

          <span className="bg-[var(--card)] border border-[var(--line)] text-[var(--amber)] text-xs font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5">
            <span>🌟</span>
            <span>
              {goldenText
                ? isGoldenDone
                  ? lang === 'ar' ? 'الهدف الذهبي: مُنجز ✅' : 'Golden Goal: Done ✅'
                  : lang === 'ar' ? 'الهدف الذهبي: قيد العمل ⏳' : 'Golden Goal: In Progress ⏳'
                : lang === 'ar' ? 'لا يوجد هدف ذهبي' : 'No Golden Goal'}
            </span>
          </span>
        </div>

        {/* Detailed Insights Box */}
        <div className="bg-[var(--ai-tint)] border border-[var(--amber)]/30 rounded-2xl p-4 text-xs leading-relaxed text-[var(--ink)] flex flex-col gap-2 shadow-xs">
          <div className="font-extrabold text-[var(--teal-dark)] text-sm">
            {lang === 'ar' ? '📊 قراءة إنتاجية اليوم وتوزيع الطاقة:' : "Today's Productivity Breakdown:"}
          </div>

          {totalFilled === 0 ? (
            <p className="text-[var(--ink-soft)] italic">
              {lang === 'ar'
                ? 'لم تقم بتسجيل أي ساعات في هذا اليوم حتى الآن. ابدأ بتسجيل أنشطتك لزيادة الوعي بوقتك اليومي!'
                : 'No hours recorded for this day yet. Start logging your activities to track your focus!'}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <p>
                {lang === 'ar'
                  ? `أنجزت تسجيل ${totalFilled} ساعة نشطة من يومك.`
                  : `You have successfully logged ${totalFilled} active hours.`}
              </p>

              <div className="grid grid-cols-2 gap-2 my-1">
                {tagCounts.E > 0 && (
                  <div className="p-2 rounded-xl bg-[var(--card)] border border-[var(--teal)]/20 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--teal)]" />
                    <span><b>{TAGS_CONFIG.E.fullTitle[lang]}:</b> {tagCounts.E}h</span>
                  </div>
                )}
                {tagCounts.V > 0 && (
                  <div className="p-2 rounded-xl bg-[var(--card)] border border-[var(--amber)]/20 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--amber)]" />
                    <span><b>{TAGS_CONFIG.V.fullTitle[lang]}:</b> {tagCounts.V}h</span>
                  </div>
                )}
                {tagCounts.R > 0 && (
                  <div className="p-2 rounded-xl bg-[var(--card)] border border-[var(--blue)]/20 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--blue)]" />
                    <span><b>{TAGS_CONFIG.R.fullTitle[lang]}:</b> {tagCounts.R}h</span>
                  </div>
                )}
                {tagCounts.S > 0 && (
                  <div className="p-2 rounded-xl bg-[var(--card)] border border-[var(--rose)]/20 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--rose)]" />
                    <span><b>{TAGS_CONFIG.S.fullTitle[lang]}:</b> {tagCounts.S}h</span>
                  </div>
                )}
                {tagCounts.SC > 0 && (
                  <div className="p-2 rounded-xl bg-[var(--card)] border border-[#7C5CBF]/20 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#7C5CBF]" />
                    <span><b>{TAGS_CONFIG.SC.fullTitle[lang]}:</b> {tagCounts.SC}h</span>
                  </div>
                )}
              </div>

              {sleepSettings.enabled && (
                <p className="text-[11px] text-[var(--ink-soft)] font-semibold mt-1">
                  🌙 {lang === 'ar' ? 'نافذة النوم مفعلة وتلقائياً مستبعدة من الحسابات لتعزيز التركيز على وقت اليقظة.' : 'Sleep window is active and excluded from daily stats for focused wake tracking.'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
