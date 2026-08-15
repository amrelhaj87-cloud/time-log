import React, { useState, useEffect } from 'react';
import { STRINGS } from '../../constants/config';
import {
  X,
  Smartphone,
  Download,
  CheckCircle2,
  WifiOff,
  Share2,
  PlusSquare,
  Laptop,
  Check,
  Zap
} from 'lucide-react';
import {
  subscribeInstallPrompt,
  triggerAppInstall,
  isStandalonePWA
} from '../../services/pwaService';

interface PwaModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en';
}

export const PwaModal: React.FC<PwaModalProps> = ({ isOpen, onClose, lang }) => {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installStatus, setInstallStatus] = useState<'idle' | 'success' | 'dismissed'>('idle');
  const [platformTab, setPlatformTab] = useState<'android' | 'ios' | 'desktop'>('android');

  const t = STRINGS[lang];

  useEffect(() => {
    setIsInstalled(isStandalonePWA());

    const unsubscribe = subscribeInstallPrompt((available) => {
      setCanInstall(available);
    });

    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleDirectInstall = async () => {
    const outcome = await triggerAppInstall();
    if (outcome === 'accepted') {
      setInstallStatus('success');
      setIsInstalled(true);
    } else if (outcome === 'dismissed') {
      setInstallStatus('dismissed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-[var(--card)] border border-[var(--line)] rounded-3xl p-4 md:p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 relative animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div className="flex items-center gap-2.5 font-bold text-lg text-[var(--ink)]">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3>{t.pwaModalTitle}</h3>
              <p className="text-[11px] font-normal text-[var(--ink-soft)]">
                {lang === 'ar' ? 'تطبيق ويب تقدمي (PWA) مع دعم العمل دون إنترنت' : 'Progressive Web App with Full Offline Support'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--ink-soft)] hover:text-rose-500 p-1.5 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Offline Features Highlight Banner */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
          <WifiOff className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">
              {lang === 'ar' ? 'جاهز للاستخدام في وضع عدم الاتصال (Offline Ready)' : 'Full Offline Mode Ready'}
            </span>
            <p className="text-[11px] text-[var(--ink-soft)] dark:text-emerald-400/80 mt-0.5 leading-relaxed">
              {lang === 'ar'
                ? 'يعمل التطبيق والـ Service Worker بكامل كفاءته حتى عند انقطاع الإنترنت، ويتم حفظ جدول يومك محلياً بشكل فوري وتلقائي.'
                : 'The Service Worker caches application assets locally, allowing you to log and track your hours seamlessly without network connection.'}
            </p>
          </div>
        </div>

        {/* 1-Click Direct Install Action (if available in browser) */}
        {isInstalled ? (
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>{lang === 'ar' ? 'التطبيق مثبت لديك كبرنامج مستقل' : 'App is installed in Standalone Mode'}</span>
            </div>
            <span className="text-[10px] bg-indigo-600 text-white font-semibold px-2 py-0.5 rounded-md">
              {lang === 'ar' ? 'نشط' : 'Active'}
            </span>
          </div>
        ) : canInstall ? (
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-indigo-500/20">
            <div className="flex items-center gap-3 text-start">
              <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-xs">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-sm">
                  {lang === 'ar' ? 'تثبيت مباشر بنقرة واحدة' : '1-Click Direct Install'}
                </h4>
                <p className="text-xs text-white/80 mt-0.5">
                  {lang === 'ar' ? 'أضف التطبيق لشاشة هاتفك أو حاسوبك فوراً' : 'Add to home screen or desktop instantly'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDirectInstall}
              className="w-full sm:w-auto px-4 py-2 bg-white text-indigo-700 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-md cursor-pointer transition-transform hover:scale-105 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>{lang === 'ar' ? 'تثبيت التطبيق الآن' : 'Install App Now'}</span>
            </button>
          </div>
        ) : installStatus === 'success' ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <Check className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تم تثبيت التطبيق بنجاح على جهازك!' : 'App installed successfully!'}</span>
          </div>
        ) : null}

        {/* Platform Selection Tabs */}
        <div className="flex flex-col gap-2">
          <div className="text-xs font-bold text-[var(--ink)] flex items-center justify-between">
            <span>{lang === 'ar' ? 'دليل التثبيت اليدوي حسب نظامك:' : 'Installation Instructions by Platform:'}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-[var(--bg)] p-1 rounded-xl border border-[var(--line)] text-xs">
            <button
              type="button"
              onClick={() => setPlatformTab('android')}
              className={`py-1.5 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                platformTab === 'android'
                  ? 'bg-[var(--card)] text-indigo-600 dark:text-indigo-400 border border-[var(--line)] shadow-xs'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android</span>
            </button>
            <button
              type="button"
              onClick={() => setPlatformTab('ios')}
              className={`py-1.5 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                platformTab === 'ios'
                  ? 'bg-[var(--card)] text-indigo-600 dark:text-indigo-400 border border-[var(--line)] shadow-xs'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>iOS (iPhone/iPad)</span>
            </button>
            <button
              type="button"
              onClick={() => setPlatformTab('desktop')}
              className={`py-1.5 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                platformTab === 'desktop'
                  ? 'bg-[var(--card)] text-indigo-600 dark:text-indigo-400 border border-[var(--line)] shadow-xs'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>PC / Mac</span>
            </button>
          </div>
        </div>

        {/* Instructions Content */}
        <div className="bg-[var(--bg)] border border-[var(--line)] rounded-2xl p-3.5 text-xs text-[var(--ink)] flex flex-col gap-2.5">
          {platformTab === 'android' && (
            <div className="flex flex-col gap-2">
              <div className="font-bold flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <Smartphone className="w-4 h-4" />
                <span>{lang === 'ar' ? 'خطوات التثبيت في هواتف أندرويد (Chrome):' : 'Android Chrome Steps:'}</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-[var(--ink-soft)] leading-relaxed">
                <li>
                  {lang === 'ar'
                    ? 'اضغط على زر خيارات المتصفح (الثلاث نقاط ︙) في أعلى زاوية الشاشة.'
                    : 'Open the browser menu (three dots ︙) in the top corner.'}
                </li>
                <li>
                  {lang === 'ar'
                    ? 'اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية" (Add to Home screen).'
                    : 'Select "Install app" or "Add to Home screen".'}
                </li>
                <li>
                  {lang === 'ar'
                    ? 'ستظهر أيقونة التطبيق على شاشتك الرئيسية ويعمل بشكل مستقل وسريع بدون شريط المتصفح.'
                    : 'The app icon will appear on your home screen and run standalone.'}
                </li>
              </ol>
            </div>
          )}

          {platformTab === 'ios' && (
            <div className="flex flex-col gap-2">
              <div className="font-bold flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <Share2 className="w-4 h-4" />
                <span>{lang === 'ar' ? 'خطوات التثبيت على آيفون وآيباد (Safari):' : 'iOS Safari Steps:'}</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-[var(--ink-soft)] leading-relaxed">
                <li className="flex items-center gap-1">
                  <span>{lang === 'ar' ? 'اضغط على زر المشاركة' : 'Tap the Share button'}</span>
                  <Share2 className="w-3.5 h-3.5 inline text-indigo-600" />
                  <span>{lang === 'ar' ? 'في أسفل متصفح Safari.' : 'at the bottom of Safari.'}</span>
                </li>
                <li className="flex items-center gap-1">
                  <span>{lang === 'ar' ? 'مرر للأسفل واختر "إضافة إلى الشاشة الرئيسية"' : 'Scroll down and tap "Add to Home Screen"'}</span>
                  <PlusSquare className="w-3.5 h-3.5 inline text-indigo-600" />
                </li>
                <li>
                  {lang === 'ar'
                    ? 'اضغط على "إضافة" (Add) في الزاوية العلوية.'
                    : 'Tap "Add" in the top corner to complete.'}
                </li>
              </ol>
            </div>
          )}

          {platformTab === 'desktop' && (
            <div className="flex flex-col gap-2">
              <div className="font-bold flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <Laptop className="w-4 h-4" />
                <span>{lang === 'ar' ? 'خطوات التثبيت على الكمبيوتر (Chrome / Edge / Brave):' : 'Desktop (Chrome / Edge) Steps:'}</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-[var(--ink-soft)] leading-relaxed">
                <li>
                  {lang === 'ar'
                    ? 'انقر على أيقونة التثبيت (🖥️ أو ⬇️) في شريط العنوان أعلى المتصفح.'
                    : 'Click the Install icon (computer or download arrow) in the browser address bar.'}
                </li>
                <li>
                  {lang === 'ar'
                    ? 'أو افتح قائمة المتصفح (︙) واختر "تثبيت سجل الوقت".'
                    : 'Or open menu (︙) and choose "Install Time Log".'}
                </li>
                <li>
                  {lang === 'ar'
                    ? 'سيفتح التطبيق كنافذة برنامج مستقلة على سطح المكتب مع إمكانية تثبيته بشريط المهام.'
                    : 'The app will open in its own dedicated window and can be pinned to your taskbar/dock.'}
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-[var(--line)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all cursor-pointer shadow-xs"
          >
            {lang === 'ar' ? 'تم، إغلاق' : 'Done, Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
