import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TodoItem, TagCode } from '../../types';
import { TAGS_CONFIG, QUADS_CONFIG } from '../../constants/config';
import {
  X,
  Plus,
  Trash2,
  Star,
  Target,
  Sparkles,
  Inbox,
  CheckCircle2,
  Circle,
  ChevronDown,
  Layers
} from 'lucide-react';

interface TodoInboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  todos: TodoItem[];
  onAddTodo: (text: string, tag: TagCode) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onPromoteToGolden: (todo: TodoItem) => void;
  onPromoteToQuad: (todo: TodoItem, quadKey: 'q1' | 'q2' | 'q3' | 'q4') => void;
  lang: 'ar' | 'en';
}

const AVAILABLE_TAGS: TagCode[] = ['E', 'V', 'SC', 'S', 'R', 'W', 'SL'];

export const TodoInboxDrawer: React.FC<TodoInboxDrawerProps> = ({
  isOpen,
  onClose,
  todos,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onPromoteToGolden,
  onPromoteToQuad,
  lang
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedTag, setSelectedTag] = useState<TagCode>('E');
  const [filterTag, setFilterTag] = useState<string>('all'); // 'all', 'active', 'done', or specific TagCode
  const [activeQuadMenuId, setActiveQuadMenuId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Focus input on drawer open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      setActiveQuadMenuId(null);
    }
  }, [isOpen]);

  // Close quad menu when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveQuadMenuId(null);
      }
    };
    if (activeQuadMenuId) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [activeQuadMenuId]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (activeQuadMenuId) {
          setActiveQuadMenuId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, activeQuadMenuId, onClose]);

  // Distribution & Balance Calculation across the 7 tags
  const tagStats = useMemo(() => {
    const counts: Record<TagCode, number> = { '': 0, E: 0, V: 0, SC: 0, S: 0, R: 0, W: 0, SL: 0 };
    let totalActive = 0;
    todos.forEach((t) => {
      if (!t.done) {
        counts[t.tag] = (counts[t.tag] || 0) + 1;
        totalActive++;
      }
    });

    const activeAspectsCount = AVAILABLE_TAGS.filter((tag) => counts[tag] > 0).length;
    return { counts, totalActive, activeAspectsCount };
  }, [todos]);

  // Filtered todos
  const filteredTodos = useMemo(() => {
    return todos.filter((item) => {
      if (filterTag === 'active') return !item.done;
      if (filterTag === 'done') return item.done;
      if (filterTag !== 'all') return item.tag === filterTag;
      return true;
    });
  }, [todos, filterTag]);

  if (!isOpen) return null;

  const handleCreate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onAddTodo(trimmed, selectedTag);
    setInputText('');
    inputRef.current?.focus();
  };

  const getTagTitle = (code: TagCode) => {
    const cfg = TAGS_CONFIG[code];
    if (!cfg) return code;
    return cfg.fullTitle[lang].split('(')[0].trim();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
      />

      {/* Drawer Panel */}
      <div
        className="relative z-10 w-full sm:w-[460px] md:w-[500px] bg-[var(--card)] text-[var(--ink)] h-full shadow-2xl border-s border-[var(--line)] flex flex-col transition-transform duration-300 animate-in slide-in-from-right"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--line)] flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-950/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-[var(--ink)] flex items-center gap-2">
                <span>{lang === 'ar' ? 'صندوق الأفكار والمهام' : 'Brain Dump & Inbox'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold">
                  {tagStats.totalActive}
                </span>
              </h2>
              <p className="text-[11px] text-[var(--ink-soft)] font-medium">
                {lang === 'ar'
                  ? 'اكتب أفكارك بسرعة ووزّعها على مجالات حياتك والأولويات'
                  : 'Capture ideas quickly & distribute across life dimensions'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-colors cursor-pointer"
            title={lang === 'ar' ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 7-Dimensions Balance Bar */}
        <div className="px-4 py-3 border-b border-[var(--line)] bg-[var(--bg)] shrink-0 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[var(--ink)] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>{lang === 'ar' ? 'توازن جوانب الحياة السبعة:' : '7 Life Dimensions Balance:'}</span>
            </span>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                tagStats.activeAspectsCount >= 4
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
              }`}
            >
              {lang === 'ar'
                ? `${tagStats.activeAspectsCount} من 7 مجالات نشطة`
                : `${tagStats.activeAspectsCount}/7 active areas`}
            </span>
          </div>

          {/* Mini Visual Distribution Track */}
          <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
            {AVAILABLE_TAGS.map((tag) => {
              const count = tagStats.counts[tag] || 0;
              const pct = tagStats.totalActive > 0 ? (count / tagStats.totalActive) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={tag}
                  style={{ width: `${pct}%`, backgroundColor: TAGS_CONFIG[tag]?.color }}
                  className="h-full transition-all duration-300"
                  title={`${getTagTitle(tag)}: ${count}`}
                />
              );
            })}
          </div>

          {/* Quick Tag Badges / Counters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
            {AVAILABLE_TAGS.map((tag) => {
              const count = tagStats.counts[tag] || 0;
              const isSelected = filterTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setFilterTag(isSelected ? 'all' : tag)}
                  className={`px-2 py-0.5 rounded-md font-medium transition-all shrink-0 flex items-center gap-1 cursor-pointer border ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs'
                      : 'border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: TAGS_CONFIG[tag]?.color }}
                  />
                  <span>{tag}</span>
                  {count > 0 && <span className="font-mono text-[10px] opacity-80">({count})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Add Form */}
        <form
          onSubmit={handleCreate}
          className="p-3.5 border-b border-[var(--line)] bg-[var(--card)] shrink-0 flex flex-col gap-2.5 shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={lang === 'ar' ? 'اكتب مهمة أو فكرة جديدة (Enter للإضافة)...' : 'Add new task or brain dump...'}
              className="flex-1 text-sm bg-[var(--bg)] border border-[var(--line)] focus:border-indigo-500 rounded-xl px-3 py-2 outline-hidden transition-all text-[var(--ink)] placeholder:text-[var(--ink-soft)]"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1 shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{lang === 'ar' ? 'إضافة' : 'Add'}</span>
            </button>
          </div>

          {/* Tag Selector for new task */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
            <span className="text-[11px] text-[var(--ink-soft)] font-medium shrink-0">
              {lang === 'ar' ? 'التصنيف:' : 'Category:'}
            </span>
            {AVAILABLE_TAGS.map((tag) => {
              const isSelected = selectedTag === tag;
              const cfg = TAGS_CONFIG[tag];
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-xs scale-102 ring-1 ring-indigo-400'
                      : 'bg-[var(--bg)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: isSelected ? '#ffffff' : cfg?.color }}
                  />
                  <span>{cfg?.fullTitle[lang].split('(')[0].trim()}</span>
                  <span className="opacity-75 font-mono text-[10px]">[{tag}]</span>
                </button>
              );
            })}
          </div>
        </form>

        {/* Filter Pills (All / Active / Completed) */}
        <div className="px-4 py-2 border-b border-[var(--line)] bg-[var(--bg)]/50 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilterTag('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterTag === 'all'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)]'
              }`}
            >
              {lang === 'ar' ? 'الكل' : 'All'} ({todos.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTag('active')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterTag === 'active'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)]'
              }`}
            >
              {lang === 'ar' ? 'قيد التنفيذ' : 'Pending'} ({tagStats.totalActive})
            </button>
            <button
              type="button"
              onClick={() => setFilterTag('done')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filterTag === 'done'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--bg)]'
              }`}
            >
              {lang === 'ar' ? 'المنجز' : 'Done'} ({todos.length - tagStats.totalActive})
            </button>
          </div>

          {filterTag !== 'all' && (
            <button
              type="button"
              onClick={() => setFilterTag('all')}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {lang === 'ar' ? 'إعادة ضبط' : 'Reset'}
            </button>
          )}
        </div>

        {/* Task Items List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
          {filteredTodos.length === 0 ? (
            <div className="py-12 text-center text-[var(--ink-soft)] flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 opacity-80" />
              </div>
              <p className="font-semibold text-sm text-[var(--ink)]">
                {lang === 'ar' ? 'لا توجد مهام في هذا التصنيف' : 'No tasks in this view'}
              </p>
              <p className="text-xs max-w-xs text-[var(--ink-soft)]">
                {lang === 'ar'
                  ? 'اكتب أي فكرة أو مهمة عشوائية في الحقل أعلاه لتنظيمها وتوزيعها لاحقاً'
                  : 'Write any idea or task above to organize and promote later'}
              </p>
            </div>
          ) : (
            filteredTodos.map((item) => {
              const tagCfg = TAGS_CONFIG[item.tag];
              const isQuadMenuOpen = activeQuadMenuId === item.id;

              return (
                <div
                  key={item.id}
                  className={`group p-3 rounded-xl border transition-all flex flex-col gap-2.5 ${
                    item.done
                      ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                      : 'bg-[var(--card)] border-[var(--line)] hover:border-indigo-300 dark:hover:border-indigo-700 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => onToggleTodo(item.id)}
                        className="mt-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer shrink-0"
                      >
                        {item.done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <span
                          className={`text-xs sm:text-sm font-medium leading-relaxed break-words ${
                            item.done
                              ? 'line-through text-[var(--ink-soft)]'
                              : 'text-[var(--ink)]'
                          }`}
                        >
                          {item.text}
                        </span>

                        {/* Tag Badge */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border"
                            style={{
                              borderColor: tagCfg?.color || 'var(--line)',
                              color: tagCfg?.color || 'var(--ink-soft)',
                              backgroundColor: tagCfg?.bgTint || 'var(--card)'
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: tagCfg?.color || 'var(--ink-soft)' }}
                            />
                            <span>{tagCfg?.fullTitle[lang].split('(')[0].trim() || item.tag}</span>
                            <span className="font-mono opacity-70">[{item.tag}]</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => onDeleteTodo(item.id)}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded-md opacity-60 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                      title={lang === 'ar' ? 'حذف من الصندوق' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Promotion Actions Bar */}
                  {!item.done && (
                    <div className="pt-2 border-t border-[var(--line)]/70 flex items-center justify-between gap-1 text-xs">
                      {/* Promote to Golden Goal Button */}
                      <button
                        type="button"
                        onClick={() => onPromoteToGolden(item)}
                        className="flex-1 py-1 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300/80 dark:border-amber-700/60 font-semibold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer hover:scale-[1.01] active:scale-95 shadow-2xs"
                        title={lang === 'ar' ? 'تعيين كهدف ذهبي لليوم (The One Thing)' : 'Set as Golden Goal for today'}
                      >
                        <Star className="w-3 h-3 text-amber-600 dark:text-amber-400 fill-amber-500" />
                        <span>{lang === 'ar' ? 'هدف ذهبي ⭐' : 'Golden Goal ⭐'}</span>
                      </button>

                      {/* Promote to Eisenhower Quad Button with Dropdown */}
                      <div className="relative flex-1" ref={isQuadMenuOpen ? menuRef : null}>
                        <button
                          type="button"
                          onClick={() => setActiveQuadMenuId(isQuadMenuOpen ? null : item.id)}
                          className="w-full py-1 px-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer hover:scale-[1.01] active:scale-95 shadow-2xs"
                          title={lang === 'ar' ? 'توجيه لمصفوفة الأولويات' : 'Send to Priority Matrix'}
                        >
                          <Target className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          <span>{lang === 'ar' ? 'مصفوفة الأولويات 🎯' : 'Priorities 🎯'}</span>
                          <ChevronDown className="w-2.5 h-2.5 opacity-70" />
                        </button>

                        {/* Quad Selection Menu */}
                        {isQuadMenuOpen && (
                          <div
                            className={`absolute bottom-full mb-1.5 z-50 bg-[var(--card)] border border-[var(--line)] rounded-xl p-1.5 shadow-xl w-52 flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95 duration-150 ${
                              lang === 'ar' ? 'left-0' : 'right-0'
                            }`}
                          >
                            <div className="px-2 py-1 text-[10px] font-bold text-[var(--ink-soft)] border-b border-[var(--line)]">
                              {lang === 'ar' ? 'اختر مربع الأولويات:' : 'Choose Eisenhower Quad:'}
                            </div>
                            {QUADS_CONFIG.map((q) => (
                              <button
                                key={q.key}
                                type="button"
                                onClick={() => {
                                  onPromoteToQuad(item, q.key as 'q1' | 'q2' | 'q3' | 'q4');
                                  setActiveQuadMenuId(null);
                                }}
                                className="w-full p-1.5 rounded-lg text-start flex items-center gap-2 hover:bg-[var(--bg)] transition-colors cursor-pointer"
                              >
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: q.color }}
                                />
                                <span className="font-bold text-[11px] text-[var(--ink)]">
                                  {q.key.toUpperCase()}
                                </span>
                                <span className="text-[10px] text-[var(--ink-soft)] truncate">
                                  {q.title[lang].split('(')[0].replace(/^[^\w\s\u0600-\u06FF]+/, '').trim()}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-[var(--line)] bg-[var(--bg)]/80 text-[11px] text-[var(--ink-soft)] flex items-center justify-between shrink-0">
          <span>
            {lang === 'ar'
              ? '✨ يتم حفظ وتفريغ أفكارك محلياً ومزامنتها تلقائياً'
              : '✨ Ideas saved locally & synced automatically'}
          </span>
          <span className="font-mono text-[10px]">{todos.length} items</span>
        </div>
      </div>
    </div>
  );
};
