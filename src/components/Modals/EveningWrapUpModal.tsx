import React from 'react';
import { TagCode } from '../../types';
import { TAGS_CONFIG } from '../../constants/config';
import type { WrapUpSummary } from '../../utils/eveningWrapUp';
import { Moon, Sparkles, Check, X, ExternalLink, Target, Flame } from 'lucide-react';
import { soundManager } from '../../utils/soundEffects';

interface EveningWrapUpModalProps {
  isOpen: boolean;
  /** Human label of the reviewed day (e.g. "الخميس 19 نوفمبر"). */
  dayLabel: string;
  summary: WrapUpSummary | null;
  lang: 'ar' | 'en';
  onClose: () => void;
  onViewDay?: () => void;
}

/**
 * حصاد المساء — a light review of the day that ended, offered once from 05:00.
 * Read-only: it never writes to the week data.
 */
export const EveningWrapUpModal: React.FC<EveningWrapUpModalProps> = ({
  isOpen,
  dayLabel,
  summary,
  lang,
  onClose,
  onViewDay
}) => {
  if (!isOpen || !summary) return null;

  const ar = lang === 'ar';
  const totalLabel = `${summary.totalLogged}`;

  const strongest = summary.strongestTag;
  const weakest = summary.weakestTag;

  const insight = (() => {
    if (summary.totalLogged === 0) {
      return ar
        ? 'لم تُسجّل ساعات في هذا اليوم. لا بأس — يوم جديد بدأ الآن، وساعة واحدة تكفي للبدء.'
        : 'No hours were logged that day. That is fine — a new day just started, and one hour is enough to begin.';
    }
    if (strongest && weakest) {
      const strongName = TAGS_CONFIG[strongest.code].fullTitle[ar ? 'ar' : 'en'];
      const weakName = TAGS_CONFIG[weakest.code].fullTitle[ar ? 'ar' : 'en'];
      return ar
        ? `أكبر حضور كان في «${strongName}» (${strongest.logged} ساعات)، وأقل حضور في «${weakName}» — فرصة لطيفة لإعادة التوازن اليوم.`
        : `Your strongest side was "${strongName}" (${strongest.logged} hrs), while "${weakName}" had the least attention — a gentle chance to rebalance today.`;
    }
    return ar
      ? 'كل الجوانب غطّت أهدافها اليومية. حافظ على هذا الإيقاع غداً!'
      : 'Every side met its daily target. Keep this rhythm going tomorrow!';
  })();

  const handleClose = () => {
    soundManager.playClick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-[var(--card)] border border-[var(--line)] rounded-3xl p-5 md:p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 relative animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 shrink-0">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[var(--ink)] flex items-center gap-1.5">
                <span>{ar ? 'حصاد اليوم' : 'Daily Wrap-up'}</span>
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              </h3>
              <span className="text-[11px] text-[var(--ink-soft)] font-medium">{dayLabel}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-[var(--ink-soft)] hover:text-rose-500 p-1.5 rounded-xl transition-all cursor-pointer"
            title={ar ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero: hours logged */}
        <div className="bg-[var(--bg)] border border-[var(--line)] rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-[var(--ink)] font-mono">{totalLabel}</span>
            <span className="text-xs font-bold text-[var(--ink-soft)]">
              {ar ? `من ${summary.activeHours} ساعة نشطة` : `of ${summary.activeHours} active hours`}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--ink-soft)]">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>{Math.round(summary.coverage * 100)}%</span>
          </div>
        </div>

        {/* Balance per tag */}
        <div className="flex flex-col gap-1.5">
          {summary.balance.map((row) => {
            const cfg = TAGS_CONFIG[row.code as TagCode];
            return (
              <div key={row.code} className="flex items-center gap-2">
                <span className="w-7 text-[10px] font-bold" style={{ color: cfg.color }}>
                  {row.code}
                </span>
                <div className="flex-1 h-2 rounded-full bg-[var(--bg)] border border-[var(--line)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.round(row.ratio * 100)}%`, backgroundColor: cfg.color }}
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-[var(--ink-soft)] w-12 text-end">
                  {row.logged}/{row.target}h
                </span>
              </div>
            );
          })}
        </div>

        {/* Top activities */}
        {summary.topActivities.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-[var(--ink-soft)] uppercase tracking-wide">
              {ar ? 'أكثر ما تكرر' : 'Most repeated'}
            </span>
            {summary.topActivities.map((act) => (
              <div
                key={act.text}
                className="flex items-center justify-between gap-2 bg-[var(--bg)] border border-[var(--line)] rounded-xl px-3 py-1.5"
              >
                <span className="text-xs font-semibold text-[var(--ink)] truncate" title={act.text}>
                  {act.text}
                </span>
                <span className="text-[10px] font-bold text-[var(--ink-soft)] shrink-0">{act.count}×</span>
              </div>
            ))}
          </div>
        )}

        {/* Golden goal */}
        <div className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--line)] rounded-xl px-3 py-2">
          <Target className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-[11px] font-semibold text-[var(--ink)] truncate flex-1">
            {summary.goldenGoal || (ar ? 'لم تحدد هدفاً ذهبياً لهذا اليوم' : 'No golden goal was set for that day')}
          </span>
          {summary.goldenGoal && (
            <span className={`text-[10px] font-bold shrink-0 ${summary.goldenDone ? 'text-emerald-600' : 'text-[var(--ink-soft)]'}`}>
              {summary.goldenDone ? (ar ? 'منجز ✓' : 'Done ✓') : ar ? 'غير منجز' : 'Not done'}
            </span>
          )}
        </div>

        {/* Insight */}
        <div className="text-[11px] sm:text-xs font-semibold leading-relaxed text-[var(--ink)] bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-3">
          {insight}
        </div>

        {/* Actions */}
        <div className="pt-2 border-t border-[var(--line)] flex items-center gap-2">
          {onViewDay && (
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onViewDay();
                onClose();
              }}
              className="flex-1 bg-[var(--bg)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--ink)] font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{ar ? 'عرض هذا اليوم' : 'View that day'}</span>
            </button>
          )}
          <button
            type="button"
            autoFocus
            onClick={handleClose}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer hover:scale-[1.02] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]"
          >
            <Check className="w-4 h-4" />
            <span>{ar ? 'تم' : 'Done'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
