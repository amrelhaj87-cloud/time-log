import React from 'react';
import { APP_VERSION, STRINGS } from '../constants/config';

/** Page footer: tagline, license, privacy link and version. */
export const AppFooter: React.FC<{ lang: 'ar' | 'en' }> = ({ lang }) => (
  <footer className="text-center text-xs text-[var(--ink-soft)] mt-8 mb-4 flex flex-col items-center justify-center gap-1.5 no-print select-none">
    <p className="text-[11px] text-[var(--ink-faint)]">{STRINGS[lang].footer}</p>
    <div className="text-[11px] font-medium text-[var(--ink-soft)] flex items-center gap-1.5">
      <span>© 2026 zerocold · {lang === 'ar' ? 'مفتوح المصدر (MIT)' : 'Open source (MIT)'}</span>
      <span className="text-[var(--line)]">•</span>
      <a href="/privacy/" target="_blank" rel="noopener" className="underline hover:text-[var(--ink)]">
        {lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy'}
      </a>
    </div>
    <div className="flex items-center justify-center pt-0.5">
      <span className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 font-mono px-2.5 py-0.5 rounded-md text-[10px] font-semibold shadow-2xs">
        {lang === 'ar' ? `الإصدار ${APP_VERSION}` : `Version ${APP_VERSION}`}
      </span>
    </div>
  </footer>
);
