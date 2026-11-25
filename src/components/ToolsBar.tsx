import React from 'react';
import { BarChart3, Download, Sparkles } from 'lucide-react';
import { STRINGS } from '../constants/config';

interface ToolsBarProps {
  lang: 'ar' | 'en';
  onOpenSummary: () => void;
  onOpenCharts: () => void;
  onOpenExport: () => void;
}

const BTN =
  'bg-[var(--card)] hover:bg-[var(--bg)] border border-[var(--line)] hover:border-indigo-400 dark:hover:border-indigo-500 text-[var(--ink)] py-2 px-1.5 sm:px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 sm:gap-2 shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer';
const LABEL = 'whitespace-nowrap text-[11px] sm:text-xs font-bold';

/** Advanced tools row (Settings → advanced tools): day summary, charts, export. */
export const ToolsBar: React.FC<ToolsBarProps> = ({ lang, onOpenSummary, onOpenCharts, onOpenExport }) => {
  const t = STRINGS[lang];
  const ar = lang === 'ar';
  return (
    <div className="grid grid-cols-3 gap-2 mb-3.5 animate-in fade-in">
      <button type="button" onClick={onOpenSummary} className={BTN} title={t.aiModalTitle}>
        <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span className={LABEL}>{ar ? 'ملخص ذكي' : 'AI Summary'}</span>
      </button>
      <button type="button" onClick={onOpenCharts} className={BTN} title={t.chartsModalTitle}>
        <BarChart3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span className={LABEL}>{ar ? 'الإحصائيات' : 'Charts'}</span>
      </button>
      <button type="button" onClick={onOpenExport} className={BTN} title={t.exportModalTitle}>
        <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className={LABEL}>{ar ? 'تصدير' : 'Export'}</span>
      </button>
    </div>
  );
};
