import React, { useState, useRef } from 'react';
import { WeekData, SleepSettings } from '../../types';
import { STRINGS, HOUR_LABELS, HOURS_LIST, TAGS_CONFIG, DAY_NAMES, MONTH_NAMES, APP_VERSION } from '../../constants/config';
import { isoDate, emptyDay } from '../../utils/dateUtils';
import {
  gatherFullBackup,
  validateBackupSchema,
  isLegacyWeekBackup,
  type FullBackup,
} from '../../utils/backupUtils';
import {
  X,
  Download,
  Printer,
  FileSpreadsheet,
  FileJson,
  Copy,
  Check,
  CalendarDays,
  Upload,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  weekStart: Date;
  weekData: WeekData;
  activeHoursKeys?: string[];
  sleepSettings?: SleepSettings;
  /** Legacy: called when user imports a single-week backup */
  onImportBackup?: (data: WeekData) => void;
  /** New: called when user imports a full backup */
  onImportFullBackup?: (backup: FullBackup) => void;
  /** Current logged-in user uid (null = guest) */
  uid?: string | null;
  lang: 'ar' | 'en';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  weekStart,
  weekData,
  activeHoursKeys = HOURS_LIST,
  onImportBackup,
  onImportFullBackup,
  uid = null,
  lang
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = STRINGS[lang];

  if (!isOpen) return null;

  const dateStr = isoDate(currentDate);
  const currentDay = weekData.days[dateStr] || emptyDay();
  const dayName = DAY_NAMES[lang][currentDate.getDay()];
  const monthName = MONTH_NAMES[lang][currentDate.getMonth()];
  const formattedFullDate = `${dayName}، ${currentDate.getDate()} ${monthName} ${currentDate.getFullYear()}`;

  // 1. Clean Print for Current Day or Full Week
  const handlePrintDay = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const rowsHtml = activeHoursKeys
      .map((key) => {
        const timeLabel = HOUR_LABELS[lang][key] || key;
        const entry = currentDay.hours[key] || { text: '', tag: '' };
        const tagInfo = entry.tag ? TAGS_CONFIG[entry.tag] : null;
        const tagHtml = tagInfo
          ? `<span style="display:inline-block; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:11px; color:#fff; background-color:${tagInfo.color};">${entry.tag} - ${tagInfo.fullTitle[lang]}</span>`
          : '<span style="color:#aaa;">—</span>';

        return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 12px; font-weight: bold; font-family: monospace; width: 100px; color: #1e293b;">${timeLabel}</td>
          <td style="padding: 8px 12px; color: #0f172a;">${entry.text || '<em style="color:#94a3b8;">(فارغ / غير مسجل)</em>'}</td>
          <td style="padding: 8px 12px; width: 140px; text-align: center;">${tagHtml}</td>
        </tr>
      `;
      })
      .join('');

    const goldenGoalText = currentDay.goldenGoal?.text
      ? `<div style="margin-bottom: 15px; padding: 10px 15px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px;">
          <strong style="color: #166534;">🌟 ${lang === 'ar' ? 'الهدف الذهبي لليوم:' : 'Daily Golden Goal:'}</strong>
          <span style="margin-right: 8px; color: #14532d;">${currentDay.goldenGoal.text}</span>
        </div>`
      : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${lang === 'ar' ? 'rtl' : 'ltr'}" lang="${lang}">
      <head>
        <meta charset="utf-8">
        <title>${lang === 'ar' ? 'سجل الوقت' : 'Time Log'} - ${dateStr}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #0f172a; max-width: 800px; margin: auto; }
          h1 { font-size: 20px; margin-bottom: 4px; color: #312e81; }
          .subtitle { font-size: 13px; color: #64748b; margin-bottom: 18px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
          th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 8px 12px; text-align: ${lang === 'ar' ? 'right' : 'left'}; }
          @media print { body { padding: 0; } button { display: none; } }
        </style>
      </head>
      <body>
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #4f46e5; padding-bottom:10px; margin-bottom:15px;">
          <div>
            <h1>⏱️ ${lang === 'ar' ? 'تقرير سجل الوقت اليومي' : 'Daily Time Log Report'}</h1>
            <div class="subtitle">${formattedFullDate}</div>
          </div>
          <button onclick="window.print()" style="padding:8px 16px; background:#4f46e5; color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">${lang === 'ar' ? 'طباعة الآن' : 'Print Now'}</button>
        </div>
        ${goldenGoalText}
        <table>
          <thead>
            <tr>
              <th>${lang === 'ar' ? 'الساعة' : 'Time'}</th>
              <th>${lang === 'ar' ? 'النشاط المسجل' : 'Activity / Task'}</th>
              <th style="text-align:center;">${lang === 'ar' ? 'التصنيف' : 'Category'}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div style="margin-top:20px; font-size:11px; color:#94a3b8; text-align:center;">
          تم استخراج هذا التقرير عبر تطبيق سجل الوقت (Time Log App)
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    onClose();
  };

  // 2. CSV Export (Current Day)
  const handleExportDayCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + (lang === 'ar' ? 'الوقت,النشاط,رمز التصنيف,اسم التصنيف\n' : 'Time,Activity,Tag Code,Tag Name\n');

    activeHoursKeys.forEach((key) => {
      const label = HOUR_LABELS[lang][key] || key;
      const entry = currentDay.hours[key] || { text: '', tag: '' };
      const tagInfo = entry.tag ? TAGS_CONFIG[entry.tag] : null;
      const tagName = tagInfo ? tagInfo.fullTitle[lang] : '';
      const safeText = `"${(entry.text || '').replace(/"/g, '""')}"`;
      csvContent += `"${label}",${safeText},"${entry.tag || ''}","${tagName}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TimeLog_Day_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onClose();
  };

  // 3. CSV Export (Full Week)
  const handleExportWeekCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + (lang === 'ar' ? 'التاريخ,اليوم,الوقت,النشاط,رمز التصنيف,اسم التصنيف\n' : 'Date,Day,Time,Activity,Tag Code,Tag Name\n');

    Object.keys(weekData.days)
      .sort()
      .forEach((ds) => {
        const dObj = new Date(ds);
        const dName = DAY_NAMES[lang][dObj.getDay()] || '';
        const dayEntry = weekData.days[ds];

        activeHoursKeys.forEach((key) => {
          const timeLabel = HOUR_LABELS[lang][key] || key;
          const entry = dayEntry?.hours[key] || { text: '', tag: '' };
          const tagInfo = entry.tag ? TAGS_CONFIG[entry.tag] : null;
          const tagName = tagInfo ? tagInfo.fullTitle[lang] : '';
          const safeText = `"${(entry.text || '').replace(/"/g, '""')}"`;
          csvContent += `"${ds}","${dName}","${timeLabel}",${safeText},"${entry.tag || ''}","${tagName}"\n`;
        });
      });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TimeLog_Week_${isoDate(weekStart)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onClose();
  };

  // 4. Copy Formatted Summary Text
  const handleCopySummaryText = async () => {
    let summaryText = `📅 *${lang === 'ar' ? 'سجل الوقت اليومي' : 'Daily Time Log'} - ${formattedFullDate}*\n\n`;

    if (currentDay.goldenGoal?.text) {
      summaryText += `🌟 *${lang === 'ar' ? 'الهدف الذهبي' : 'Golden Goal'}:* ${currentDay.goldenGoal.text}\n\n`;
    }

    summaryText += `*${lang === 'ar' ? 'ساعات اليوم' : 'Hours Log'}:*\n`;

    activeHoursKeys.forEach((key) => {
      const label = HOUR_LABELS[lang][key] || key;
      const entry = currentDay.hours[key];
      if (entry && entry.text && entry.text.trim()) {
        const tagLabel = entry.tag ? ` [${entry.tag}]` : '';
        summaryText += `• ${label}: ${entry.text}${tagLabel}\n`;
      }
    });

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      // Fallback
    }
  };

  // 5a. Full Backup JSON (all weeks + inbox + prefs)
  const handleFullBackupJSON = () => {
    const backup = gatherFullBackup(uid, APP_VERSION);
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `TimeLog_FullBackup_${isoDate(new Date())}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onClose();
  };

  // 5b. Legacy single-week backup (kept for reference)
  const handleBackupJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(weekData, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `TimeLog_Week_${isoDate(weekStart)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onClose();
  };

  // 6. Unified Import — handles both full backup and legacy single-week
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // Case A: Full backup format
        if (validateBackupSchema(parsed)) {
          if (onImportFullBackup) {
            onImportFullBackup(parsed as FullBackup);
            const weekCount = Object.keys((parsed as FullBackup).weeks).length;
            setImportSuccess(
              lang === 'ar'
                ? `✅ تمت استعادة ${weekCount} أسبوع + المهام + الإعدادات`
                : `✅ Restored ${weekCount} weeks + inbox + preferences`
            );
            setTimeout(() => onClose(), 1800);
          }
          return;
        }

        // Case B: Legacy single-week format ({ days: {...} })
        if (isLegacyWeekBackup(parsed)) {
          if (onImportBackup) {
            onImportBackup(parsed as WeekData);
            setImportSuccess(lang === 'ar' ? 'تم استعادة البيانات بنجاح ✅' : 'Backup restored successfully ✅');
            setTimeout(() => onClose(), 1200);
          }
          return;
        }

        setImportError(
          lang === 'ar' ? 'ملف النسخة الاحتياطية غير صالح أو تالف' : 'Invalid or corrupted backup file'
        );
      } catch {
        setImportError(lang === 'ar' ? 'تعذر قراءة ملف JSON' : 'Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 sm:p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col gap-4 relative animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div className="flex items-center gap-2.5 font-bold text-lg text-[var(--ink)]">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Download className="w-5 h-5" />
            </div>
            <span>{t.exportModalTitle}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--ink-soft)] hover:text-rose-500 p-1.5 rounded-lg transition-all cursor-pointer hover:bg-[var(--bg)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Print & Export Reports */}
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-bold text-[var(--ink-soft)]">
            {lang === 'ar' ? 'الطباعة وتصدير الجداول (PDF & Excel)' : 'Print & Table Exports (PDF & Excel)'}
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Print Day */}
            <button
              type="button"
              onClick={handlePrintDay}
              className="bg-[var(--bg)] hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 border border-[var(--line)] hover:border-indigo-400 text-[var(--ink)] p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all shadow-2xs cursor-pointer group"
            >
              <div className="p-2 rounded-lg bg-[var(--card)] border border-[var(--line)] text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Printer className="w-4 h-4" />
              </div>
              <div className="text-start">
                <span className="block">{lang === 'ar' ? 'طباعة تقرير اليوم (PDF)' : 'Print Day Sheet (PDF)'}</span>
                <span className="text-[10px] text-[var(--ink-soft)] font-normal">{dateStr}</span>
              </div>
            </button>

            {/* Export Day CSV */}
            <button
              type="button"
              onClick={handleExportDayCSV}
              className="bg-[var(--bg)] hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 border border-[var(--line)] hover:border-emerald-400 text-[var(--ink)] p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all shadow-2xs cursor-pointer group"
            >
              <div className="p-2 rounded-lg bg-[var(--card)] border border-[var(--line)] text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="text-start">
                <span className="block">{lang === 'ar' ? 'تصدير اليوم (Excel/CSV)' : 'Export Day (CSV/Excel)'}</span>
                <span className="text-[10px] text-[var(--ink-soft)] font-normal">{lang === 'ar' ? 'ساعات اليوم مع التصنيف' : 'Day hours with tags'}</span>
              </div>
            </button>

            {/* Export Full Week CSV */}
            <button
              type="button"
              onClick={handleExportWeekCSV}
              className="bg-[var(--bg)] hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 border border-[var(--line)] hover:border-emerald-400 text-[var(--ink)] p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all shadow-2xs cursor-pointer group"
            >
              <div className="p-2 rounded-lg bg-[var(--card)] border border-[var(--line)] text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div className="text-start">
                <span className="block">{lang === 'ar' ? 'تصدير الأسبوع كاملاً (CSV)' : 'Export Full Week (CSV)'}</span>
                <span className="text-[10px] text-[var(--ink-soft)] font-normal">{lang === 'ar' ? 'جدول الـ 7 أيام كاملاً' : 'All 7 days timetable'}</span>
              </div>
            </button>

            {/* Copy Text Summary */}
            <button
              type="button"
              onClick={handleCopySummaryText}
              className="bg-[var(--bg)] hover:bg-amber-50/60 dark:hover:bg-amber-950/40 border border-[var(--line)] hover:border-amber-400 text-[var(--ink)] p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all shadow-2xs cursor-pointer group"
            >
              <div className="p-2 rounded-lg bg-[var(--card)] border border-[var(--line)] text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </div>
              <div className="text-start">
                <span className="block">{copiedText ? (lang === 'ar' ? 'تم النسخ للحافظة ✓' : 'Copied to Clipboard ✓') : (lang === 'ar' ? 'نسخ ملخص نصي' : 'Copy Text Summary')}</span>
                <span className="text-[10px] text-[var(--ink-soft)] font-normal">{lang === 'ar' ? 'للتطبيقات والملاحظات' : 'For Notes & WhatsApp'}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Section 2: Backup & Restore */}
        <div className="flex flex-col gap-2.5 pt-2 border-t border-[var(--line)]">
          <span className="text-xs font-bold text-[var(--ink-soft)]">
            {lang === 'ar' ? 'النسخ الاحتياطي واستعادة البيانات' : 'Backup & Data Restoration'}
          </span>

          {/* Full Backup — prominent card */}
          <button
            type="button"
            onClick={handleFullBackupJSON}
            className="w-full bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 text-[var(--ink)] p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all shadow-2xs cursor-pointer group"
          >
            <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-start flex-1">
              <span className="block text-indigo-700 dark:text-indigo-300">
                {lang === 'ar' ? '🔒 نسخة احتياطية كاملة (كل الأسابيع + المهام + الإعدادات)' : '🔒 Full Backup (All weeks + Inbox + Preferences)'}
              </span>
              <span className="text-[10px] text-[var(--ink-soft)] font-normal">
                {lang === 'ar' ? 'TimeLog_FullBackup_YYYY-MM-DD.json' : 'TimeLog_FullBackup_YYYY-MM-DD.json'}
              </span>
            </div>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Legacy single-week backup */}
            <button
              type="button"
              onClick={handleBackupJSON}
              className="bg-[var(--bg)] hover:bg-slate-50/60 dark:hover:bg-slate-800/40 border border-[var(--line)] hover:border-slate-400 text-[var(--ink)] p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all shadow-2xs cursor-pointer group"
            >
              <div className="p-2 rounded-lg bg-[var(--card)] border border-[var(--line)] text-slate-500 dark:text-slate-400 group-hover:bg-slate-500 group-hover:text-white transition-colors">
                <FileJson className="w-4 h-4" />
              </div>
              <div className="text-start">
                <span className="block">{lang === 'ar' ? 'نسخة الأسبوع الحالي فقط' : 'Current Week Only'}</span>
                <span className="text-[10px] text-[var(--ink-soft)] font-normal">{lang === 'ar' ? 'JSON بسيط للأسبوع' : 'Simple week JSON'}</span>
              </div>
            </button>

            {/* Restore / Import (unified) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-[var(--bg)] hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 border border-[var(--line)] hover:border-indigo-400 text-[var(--ink)] p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all shadow-2xs cursor-pointer group"
            >
              <div className="p-2 rounded-lg bg-[var(--card)] border border-[var(--line)] text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Upload className="w-4 h-4" />
              </div>
              <div className="text-start">
                <span className="block">{lang === 'ar' ? 'استعادة من ملف نسخة' : 'Restore from Backup'}</span>
                <span className="text-[10px] text-[var(--ink-soft)] font-normal">{lang === 'ar' ? 'يقبل الكاملة والأسبوعية' : 'Full or week backup'}</span>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </div>

          {importSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{importSuccess}</span>
            </div>
          )}

          {importError && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}
        </div>

        {/* Footer Close */}
        <div className="border-t border-[var(--line)] pt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[var(--bg)] hover:bg-[var(--line)] border border-[var(--line)] font-semibold text-xs text-[var(--ink)] cursor-pointer transition-all"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
