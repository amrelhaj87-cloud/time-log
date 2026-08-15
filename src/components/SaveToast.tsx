import React from 'react';
import { CheckCircle2, Loader2, Info } from 'lucide-react';

interface SaveToastProps {
  status: string;
}

export const SaveToast: React.FC<SaveToastProps> = ({ status }) => {
  const isVisible = Boolean(status && status.trim() !== '');

  const isSaving = status.includes('جاري') || status.toLowerCase().includes('saving');
  const isSaved = status.includes('تم') || status.toLowerCase().includes('saved') || status.includes('✓');

  return (
    <div
      className={`fixed bottom-6 end-6 z-50 pointer-events-none transition-all duration-300 transform ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-3 scale-95'
      }`}
      aria-live="polite"
    >
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 dark:bg-slate-800/95 text-white shadow-xl backdrop-blur-md border border-slate-700/80 text-xs font-semibold select-none">
        {isSaving ? (
          <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin shrink-0" />
        ) : isSaved ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        ) : (
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        )}
        <span className="tracking-wide">{status}</span>
      </div>
    </div>
  );
};
