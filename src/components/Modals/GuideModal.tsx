import React, { useState } from 'react';
import {
  X,
  BookOpen,
  ExternalLink,
  Target,
  Sparkles,
  Clock,
  Moon,
  Zap,
  CheckCircle2,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { TAGS_CONFIG } from '../../constants/config';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en';
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose, lang }) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'tags' | 'priorities' | 'sleep' | 'goals'>('overview');

  if (!isOpen) return null;

  const guideExternalUrl = '/guide';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-[var(--card)] border border-[var(--line)] rounded-3xl p-4 md:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col gap-4 relative animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div className="flex items-center gap-2.5 font-bold text-lg text-[var(--ink)]">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3>{lang === 'ar' ? 'دليل الشرح وفلسفة تسجيل الوقت' : 'Time Log Guide & Philosophy'}</h3>
              <p className="text-[11px] font-normal text-[var(--ink-soft)]">
                {lang === 'ar' ? 'دليلك الشامل لإتقان إدارة اليوم، التاقات الخمسة، والأولويات' : 'Master your day, the 5 tags framework, and priority matrix'}
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

        {/* External Link Highlight Banner */}
        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 shadow-xs">
              <ExternalLink className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-[var(--ink)]">
                {lang === 'ar' ? 'صفحة دليل الشرح الشامل المستقلة' : 'Full Comprehensive Online Guide'}
              </h4>
              <p className="text-[11px] text-[var(--ink-soft)] mt-0.5">
                {lang === 'ar'
                  ? 'يمكنك فتح الدليل التفصيلي والمنهجية الكاملة في صفحة خارجية جديدة للقراءة المستفيضة'
                  : 'Open the complete documentation and philosophy website in a separate tab'}
              </p>
            </div>
          </div>
          <a
            href={guideExternalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-transform hover:scale-105 flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap self-end sm:self-center"
          >
            <span>{lang === 'ar' ? 'فتح صفحة الدليل ↗' : 'Open Full Guide ↗'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-1 p-1 bg-[var(--bg)] rounded-xl border border-[var(--line)] text-xs">
          <button
            type="button"
            onClick={() => setActiveSection('overview')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSection === 'overview'
                ? 'bg-[var(--card)] text-indigo-600 dark:text-indigo-400 border border-[var(--line)] shadow-xs'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'نظرة عامة' : 'Overview'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('tags')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSection === 'tags'
                ? 'bg-[var(--card)] text-indigo-600 dark:text-indigo-400 border border-[var(--line)] shadow-xs'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'فلسفة التاقات' : '5 Tags'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('priorities')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSection === 'priorities'
                ? 'bg-[var(--card)] text-indigo-600 dark:text-indigo-400 border border-[var(--line)] shadow-xs'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'الأولويات والهدف الذهبي' : 'Priorities'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('sleep')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSection === 'sleep'
                ? 'bg-[var(--card)] text-indigo-600 dark:text-indigo-400 border border-[var(--line)] shadow-xs'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'نافذة النوم' : 'Sleep'}</span>
          </button>
        </div>

        {/* Content Section */}
        <div className="bg-[var(--bg)] border border-[var(--line)] rounded-2xl p-4 text-xs text-[var(--ink)] flex flex-col gap-3.5 leading-relaxed">
          
          {/* 1. Overview */}
          {activeSection === 'overview' && (
            <div className="flex flex-col gap-3 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-600 dark:text-indigo-400">
                <Clock className="w-4 h-4" />
                <span>{lang === 'ar' ? 'لماذا نسجل الوقت بالساعة؟' : 'Why Hourly Time Logging?'}</span>
              </div>
              <p className="text-[var(--ink-soft)]">
                {lang === 'ar'
                  ? 'سجل الوقت ليس مجرد جدول مهام تقليدي، بل هو مرآة واعية لإنتاجيتك وحياتك. تدوين ما تنجزه كل ساعة يساعدك على كشف التسويف، تقدير المجهود الفعلي، وتوزيع طاقتك بين العمل، الراحة، والنمو الشخصي.'
                  : 'Time Log is not just a to-do list; it is an honest mirror of your productivity and lifestyle. Logging what you accomplish every hour helps uncover time leaks, evaluate real focus, and balance work, rest, and personal growth.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 bg-[var(--card)] rounded-xl border border-[var(--line)] flex flex-col gap-1">
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? '١. التدوين الفوري' : '1. Real-time'}</span>
                  </div>
                  <p className="text-[11px] text-[var(--ink-soft)]">
                    {lang === 'ar' ? 'سجل نهاية كل ساعة أو استخدم التايمر لتسجيل المهام المركزة.' : 'Log at the end of each hour or use the live timer.'}
                  </p>
                </div>

                <div className="p-3 bg-[var(--card)] rounded-xl border border-[var(--line)] flex flex-col gap-1">
                  <div className="font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? '٢. التصنيف الذكي' : '2. 5 Tags'}</span>
                  </div>
                  <p className="text-[11px] text-[var(--ink-soft)]">
                    {lang === 'ar' ? 'عيّن تاق لكل ساعة لفهم أين تصب طاقتك الحقيقية.' : 'Assign a tag to understand where your energy goes.'}
                  </p>
                </div>

                <div className="p-3 bg-[var(--card)] rounded-xl border border-[var(--line)] flex flex-col gap-1">
                  <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? '٣. التركيز اليومي' : '3. Daily Focus'}</span>
                  </div>
                  <p className="text-[11px] text-[var(--ink-soft)]">
                    {lang === 'ar' ? 'حقق هدفك الذهبي وراجع إحصائيات الأسبوع والشهر.' : 'Achieve your golden goal and review weekly analytics.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. Tags Philosophy */}
          {activeSection === 'tags' && (
            <div className="flex flex-col gap-3 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-600 dark:text-indigo-400">
                <Layers className="w-4 h-4" />
                <span>{lang === 'ar' ? 'فلسفة التاقات الخمسة (The 5 Tags System)' : 'The 5 Tags System'}</span>
              </div>
              <p className="text-[var(--ink-soft)]">
                {lang === 'ar'
                  ? 'تم تصميم هذا النظام لتحقيق التوازن الحياتي الكامل، بحيث لا يطغى العمل على صحتك أو أهدافك المستقبلية:'
                  : 'Designed to achieve holistic life balance so work does not compromise your health or long-term vision:'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Earning */}
                <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)] flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold flex items-center justify-center text-xs shrink-0">
                    E
                  </span>
                  <div>
                    <h5 className="font-bold text-[var(--ink)]">{TAGS_CONFIG.E.fullTitle[lang]}</h5>
                    <p className="text-[11px] text-[var(--ink-soft)] mt-0.5">{TAGS_CONFIG.E.desc[lang]}</p>
                  </div>
                </div>

                {/* Vision */}
                <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)] flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 font-bold flex items-center justify-center text-xs shrink-0">
                    V
                  </span>
                  <div>
                    <h5 className="font-bold text-[var(--ink)]">{TAGS_CONFIG.V.fullTitle[lang]}</h5>
                    <p className="text-[11px] text-[var(--ink-soft)] mt-0.5">{TAGS_CONFIG.V.desc[lang]}</p>
                  </div>
                </div>

                {/* Recovery */}
                <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)] flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold flex items-center justify-center text-xs shrink-0">
                    R
                  </span>
                  <div>
                    <h5 className="font-bold text-[var(--ink)]">{TAGS_CONFIG.R.fullTitle[lang]}</h5>
                    <p className="text-[11px] text-[var(--ink-soft)] mt-0.5">{TAGS_CONFIG.R.desc[lang]}</p>
                  </div>
                </div>

                {/* Service */}
                <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)] flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold flex items-center justify-center text-xs shrink-0">
                    S
                  </span>
                  <div>
                    <h5 className="font-bold text-[var(--ink)]">{TAGS_CONFIG.S.fullTitle[lang]}</h5>
                    <p className="text-[11px] text-[var(--ink-soft)] mt-0.5">{TAGS_CONFIG.S.desc[lang]}</p>
                  </div>
                </div>

                {/* Self Care */}
                <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)] flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
                    SC
                  </span>
                  <div>
                    <h5 className="font-bold text-[var(--ink)]">{TAGS_CONFIG.SC.fullTitle[lang]}</h5>
                    <p className="text-[11px] text-[var(--ink-soft)] mt-0.5">{TAGS_CONFIG.SC.desc[lang]}</p>
                  </div>
                </div>

                {/* Sleep */}
                <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)] flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
                    SL
                  </span>
                  <div>
                    <h5 className="font-bold text-[var(--ink)]">{TAGS_CONFIG.SL.fullTitle[lang]}</h5>
                    <p className="text-[11px] text-[var(--ink-soft)] mt-0.5">{TAGS_CONFIG.SL.desc[lang]}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Priorities & Golden Goal */}
          {activeSection === 'priorities' && (
            <div className="flex flex-col gap-3 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-600 dark:text-indigo-400">
                <Target className="w-4 h-4" />
                <span>{lang === 'ar' ? 'الهدف الذهبي ومصفوفة الأولويات' : 'The One Thing & Priority Matrix'}</span>
              </div>
              
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex flex-col gap-1">
                <div className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'الهدف الذهبي (The One Thing):' : "The One Thing (Golden Goal):"}</span>
                </div>
                <p className="text-[11px] text-[var(--ink-soft)]">
                  {lang === 'ar'
                    ? 'المهمة الواحدة الأهم التي إذا أنجزتها اليوم، كان يومك ناجحاً واستثنائياً. يمكنك ترقية أي أولوية عاجلة لتكون هدفك الذهبي بنقرة زر النجمة ⭐.'
                    : 'The single most impactful task. If you finish this, your day is a total victory. Click the star ⭐ to promote any priority to Golden Goal.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)]">
                  <span className="font-bold text-amber-600 dark:text-amber-400">🔥 مربع ١ (عاجل ومهم):</span>
                  <p className="text-[var(--ink-soft)] mt-0.5">للأزمات والمهام الحرجة التي يجب تنفيذها اليوم فوراً.</p>
                </div>
                <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)]">
                  <span className="font-bold text-teal-600 dark:text-teal-400">🎯 مربع ٢ (مهم وغير عاجل):</span>
                  <p className="text-[var(--ink-soft)] mt-0.5">مربع الجودة، التخطيط، والنمو الاستراتيجي على المدى الطويل.</p>
                </div>
                <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)]">
                  <span className="font-bold text-blue-600 dark:text-blue-400">⚡ مربع ٣ (عاجل وغير مهم):</span>
                  <p className="text-[var(--ink-soft)] mt-0.5">المقاطعات والمهام الروتينية التي يُفضل تفويضها أو إنجازها سريعاً.</p>
                </div>
                <div className="p-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)]">
                  <span className="font-bold text-[var(--ink-soft)]">🌱 مربع ٤ (غير عاجل وغير مهم):</span>
                  <p className="text-[var(--ink-soft)] mt-0.5">مشتتات الانتباه ومضيعات الوقت التي يجب تقليصها واستبعادها.</p>
                </div>
              </div>
            </div>
          )}

          {/* 4. Sleep Window */}
          {activeSection === 'sleep' && (
            <div className="flex flex-col gap-3 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-600 dark:text-indigo-400">
                <Moon className="w-4 h-4" />
                <span>{lang === 'ar' ? 'كيف تعمل نافذة النوم؟' : 'How the Sleep Window Works'}</span>
              </div>
              <p className="text-[var(--ink-soft)]">
                {lang === 'ar'
                  ? 'لكي لا تضطر لتسجيل ساعات النوم يومياً بشكل يدوي مكرر، يقوم التطبيق بطيّ ساعات النوم المعتادة في شريط واحد أنيق ويحسب نسبة إنجاز اليوم من الساعات النشطة الفعالة (مثلاً 16 ساعة يقظة بدلاً من 24).'
                  : 'To avoid repetitive logging for sleep hours, the app neatly folds your regular sleep duration into a compact block and calculates daily progress against active waking hours (e.g., 16 waking hours).'}
              </p>

              <div className="p-3 bg-[var(--card)] border border-[var(--line)] rounded-xl flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-[11px]">
                  <span className="font-bold text-[var(--ink)]">
                    {lang === 'ar' ? 'زر "استثناء اليوم":' : '"Today\'s Exception" Button:'}
                  </span>
                  <p className="text-[var(--ink-soft)] mt-0.5">
                    {lang === 'ar'
                      ? 'إذا سهرت في يوم معين أو نمت في وقت مختلف، اضغط على زر "استثناء اليوم" لفتح الساعات الـ 24 كاملة لهذا اليوم فقط دون التأثير على إعداداتك الثابتة.'
                      : 'If you stayed up late or changed your schedule on a specific day, toggle the exception button to expand all 24 hours for today only.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
          <a
            href={guideExternalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>{lang === 'ar' ? 'زيارة صفحة الدليل الشاملة ↗' : 'Visit Full Guide Page ↗'}</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all cursor-pointer shadow-xs"
          >
            {lang === 'ar' ? 'فهمت، إغلاق' : 'Got it, Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
