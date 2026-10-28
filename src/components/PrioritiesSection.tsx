import React from 'react';
import { GoalItem, TagCode } from '../types';
import { QUADS_CONFIG, STRINGS } from '../constants/config';
import { TagPicker } from './TagPicker';
import { Target, ArrowRight, Trash2, Plus, Star, Inbox } from 'lucide-react';
import { focusCurrentHourInput } from '../utils/dateUtils';

interface PrioritiesSectionProps {
  goldenGoal: GoalItem;
  onChangeGoldenGoal: (item: GoalItem) => void;
  priorities: {
    q1: GoalItem[];
    q2: GoalItem[];
    q3: GoalItem[];
    q4: GoalItem[];
  };
  onChangePriorities: (quadKey: 'q1' | 'q2' | 'q3' | 'q4', items: GoalItem[]) => void;
  onPromoteToGolden: (item: GoalItem, quadKey: 'q1' | 'q2' | 'q3' | 'q4', itemIdx: number) => void;
  onRollover: () => void;
  onOpenTodoInbox?: () => void;
  todoCount?: number;
  lang: 'ar' | 'en';
}

export const PrioritiesSection: React.FC<PrioritiesSectionProps> = ({
  goldenGoal,
  onChangeGoldenGoal,
  priorities,
  onChangePriorities,
  onPromoteToGolden,
  onRollover,
  onOpenTodoInbox,
  todoCount,
  lang
}) => {
  const t = STRINGS[lang];

  const isGoldenEmpty = !goldenGoal.text || goldenGoal.text.trim() === '';

  // Calculate total & completed priorities
  let totalCount = 0;
  let doneCount = 0;

  if (goldenGoal.text && goldenGoal.text.trim() !== '') {
    totalCount++;
    if (goldenGoal.done) doneCount++;
  }

  QUADS_CONFIG.forEach((q) => {
    const list = priorities[q.key] || [];
    list.forEach((item) => {
      if (item.text && item.text.trim() !== '') {
        totalCount++;
        if (item.done) doneCount++;
      }
    });
  });

  const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <section className="bg-[var(--card)] border border-[var(--line)] rounded-xl p-4 shadow-xs flex flex-col gap-3.5">
      <div className="flex items-center justify-between pb-1 border-b border-[var(--line)] flex-wrap gap-2">
        <h2 className="font-bold text-base text-[var(--ink)] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
          {t.priorTitle}
        </h2>
        <div className="flex items-center gap-2.5">
          {onOpenTodoInbox && (
            <button
              type="button"
              onClick={onOpenTodoInbox}
              className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95"
              title={lang === 'ar' ? 'فتح صندوق الأفكار والمهام (Brain Dump)' : 'Open Brain Dump & Todo Inbox'}
            >
              <Inbox className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{lang === 'ar' ? 'صندوق الأفكار والمهام' : 'Brain Dump'}</span>
              {typeof todoCount === 'number' && todoCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px] font-mono font-bold">
                  {todoCount}
                </span>
              )}
            </button>
          )}
          <span className="text-[11px] font-medium text-[var(--ink-soft)]">
            {t.priorProgress(doneCount, totalCount, completionPct)}
          </span>
        </div>
      </div>

      {/* Golden Goal Card */}
      <div className="bg-amber-500/10 dark:bg-amber-950/30 border-2 border-amber-400/80 dark:border-amber-600/70 rounded-xl p-3.5 shadow-xs flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900 dark:text-amber-300">
          <span className="text-base leading-none">🌟</span>
          <span>{t.goldenTitle}</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={goldenGoal.done}
            onChange={(e) => onChangeGoldenGoal({ ...goldenGoal, done: e.target.checked })}
            className="w-4 h-4 rounded-md accent-amber-600 cursor-pointer shrink-0"
          />

          <input
            id="golden-goal-input"
            type="text"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            value={goldenGoal.text}
            onChange={(e) => onChangeGoldenGoal({ ...goldenGoal, text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const tagBtn = document.getElementById('tag-picker-btn-golden');
                if (tagBtn) {
                  tagBtn.click();
                }
              }
            }}
            placeholder={t.goldenPlaceholder}
            className={`flex-1 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 bg-transparent border-b-2 border-amber-300 dark:border-amber-700 focus:border-amber-500 outline-hidden py-1 px-1 transition-all placeholder:text-amber-900/40 dark:placeholder:text-amber-300/40 ${
              goldenGoal.done ? 'line-through opacity-50' : ''
            }`}
          />

          <TagPicker
            buttonId="tag-picker-btn-golden"
            returnFocusId="golden-goal-input"
            currentTag={goldenGoal.tag}
            onSelect={(tag) => {
              onChangeGoldenGoal({ ...goldenGoal, tag });
              focusCurrentHourInput();
            }}
            onClose={() => {
              const el = document.getElementById('golden-goal-input');
              el?.focus();
            }}
            small
            hideSleepTag
            lang={lang}
          />

          {goldenGoal.text && (
            <button
              type="button"
              onClick={() => onChangeGoldenGoal({ text: '', done: false, tag: '' })}
              className="text-rose-500 hover:text-rose-700 p-1 rounded-md opacity-60 hover:opacity-100 transition-all"
              title={lang === 'ar' ? 'مسح الهدف الذهبي' : 'Clear Golden Goal'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Priorities Progress Bar */}
      <div className="bg-[var(--bg)] border border-[var(--line)] rounded-lg p-2.5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-[var(--ink)]">
          <span className="text-[11px] text-[var(--ink-soft)]">{lang === 'ar' ? 'معدل إنجاز الأولويات' : 'Priority Completion Rate'}</span>
          <span className="font-mono bg-[var(--card)] px-2 py-0.5 rounded-md border border-[var(--line)] font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">
            {completionPct}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-[var(--line)] rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all duration-300"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* 4 Quadrants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {QUADS_CONFIG.map((q) => {
          const items = priorities[q.key] || [];

          const handleUpdateItem = (idx: number, updated: GoalItem) => {
            const copy = [...items];
            copy[idx] = updated;
            onChangePriorities(q.key, copy);
          };

          const handleAddItem = () => {
            onChangePriorities(q.key, [...items, { text: '', done: false, tag: '' }]);
          };

          const handleDeleteItem = (idx: number) => {
            const copy = items.filter((_, i) => i !== idx);
            onChangePriorities(q.key, copy.length === 0 ? [{ text: '', done: false, tag: '' }] : copy);
          };

          return (
            <div
              key={q.key}
              className="rounded-xl p-3 border border-[var(--line)] flex flex-col gap-2 transition-all shadow-xs"
              style={{ backgroundColor: q.bg }}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold" style={{ color: q.color }}>
                  {q.title[lang]}
                </div>
                {items.some((it) => it.text && it.text.trim() !== '') && (
                  <button
                    type="button"
                    onClick={() => onChangePriorities(q.key, [{ text: '', done: false, tag: '' }])}
                    className="text-[10px] text-[var(--ink-soft)] hover:text-rose-600 dark:hover:text-rose-400 opacity-60 hover:opacity-100 transition-all flex items-center gap-1 cursor-pointer px-1 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title={lang === 'ar' ? 'مسح كافة أولويات هذا المربع' : 'Clear all in this quadrant'}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                    <span>{lang === 'ar' ? 'مسح المربع' : 'Clear'}</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5 flex-1">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 bg-[var(--card)] p-2 rounded-lg border border-[var(--line)] group shadow-xs"
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(e) => handleUpdateItem(idx, { ...item, done: e.target.checked })}
                      className="w-3.5 h-3.5 rounded-md accent-indigo-600 cursor-pointer shrink-0"
                    />

                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => handleUpdateItem(idx, { ...item, text: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const tagBtn = document.getElementById(`tag-picker-btn-priority-${q.key}-${idx}`);
                          if (tagBtn) {
                            tagBtn.click();
                          }
                        }
                      }}
                      placeholder={`${t.priorityPlaceholder}${idx + 1}`}
                      className={`flex-1 text-xs text-[var(--ink)] bg-transparent border-b border-transparent focus:border-indigo-500 outline-hidden py-0.5 px-1 transition-all ${
                        item.done ? 'line-through opacity-50' : ''
                      }`}
                    />

                    <TagPicker
                      buttonId={`tag-picker-btn-priority-${q.key}-${idx}`}
                      currentTag={item.tag}
                      onSelect={(tag) => handleUpdateItem(idx, { ...item, tag })}
                      small
                      hideSleepTag
                      lang={lang}
                    />

                    {/* Promote button for Q1 / Q2 (Only moves if Golden Goal is empty, and deletes from current list) */}
                    {(q.key === 'q1' || q.key === 'q2') && item.text && item.text.trim() !== '' && (
                      <button
                        type="button"
                        onClick={() => onPromoteToGolden(item, q.key, idx)}
                        className={`p-1 rounded-md transition-all shrink-0 flex items-center justify-center cursor-pointer ${
                          isGoldenEmpty
                            ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-950/60 hover:scale-110 shadow-xs'
                            : 'text-amber-500/35 hover:text-amber-500/60 cursor-not-allowed'
                        }`}
                        title={
                          isGoldenEmpty
                            ? (lang === 'ar' ? 'نقل المهمة إلى الهدف الذهبي 🌟 وحذفها من هنا' : 'Move to Golden Goal 🌟 and remove from here')
                            : (lang === 'ar' ? '⚠️ الهدف الذهبي ممتلئ بالفعل - يجب إفراغه أولاً للتمكن من النقل' : '⚠️ Golden Goal is not empty - clear it first to transfer')
                        }
                      >
                        <Star className={`w-3.5 h-3.5 ${isGoldenEmpty ? 'fill-amber-400/30' : ''}`} />
                      </button>
                    )}

                    {/* Clear / Delete Button for priority item (just like Golden Goal) */}
                    {(item.text || item.tag || items.length > 1) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (items.length > 1) {
                            handleDeleteItem(idx);
                          } else {
                            handleUpdateItem(idx, { text: '', done: false, tag: '' });
                          }
                        }}
                        className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all shrink-0 cursor-pointer"
                        title={lang === 'ar' ? (items.length > 1 ? 'حذف هذا السطر' : 'مسح الأولوية') : (items.length > 1 ? 'Delete' : 'Clear')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="w-full text-center py-1.5 rounded-lg text-[11px] font-medium text-[var(--ink-soft)] bg-[var(--card)] hover:bg-[var(--card)] border border-dashed border-[var(--line)] hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-1 mt-1"
              >
                <Plus className="w-3 h-3" />
                <span>{t.addPriority}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Rollover to Tomorrow Button */}
      <div className="flex items-center justify-center pt-1">
        <button
          type="button"
          onClick={onRollover}
          className="bg-[var(--card)] hover:bg-indigo-600 hover:text-white border border-[var(--line)] hover:border-indigo-600 text-[var(--ink)] hover:text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95 select-none"
          title={lang === 'ar' ? 'ترحيل جميع المهام غير المنجزة (الهدف الذهبي والمربعات الأربعة) إلى الغد' : 'Rollover all incomplete priorities & golden goal to tomorrow'}
        >
          <ArrowRight className={`w-3.5 h-3.5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
          <span>{t.txtRollover}</span>
        </button>
      </div>
    </section>
  );
};
