import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TagCode } from '../../types';
import { TAGS_CONFIG } from '../../constants/config';
import {
  SearchEntry,
  FrequencyGroup,
  SortMode,
  buildSearchIndex,
  querySearchIndex,
  sortSearchEntries,
  buildFrequencyGroups
} from '../../utils/searchUtils';
import {
  X,
  Search,
  Calendar,
  Clock,
  Flame,
  ArrowUpDown,
  Filter,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  uid: string | null;
  lang: 'ar' | 'en';
  onNavigateToDate?: (dateStr: string) => void;
}

const TAG_KEYS: Array<{ code: TagCode | 'ALL' | 'UNTAGGED'; labelAr: string; labelEn: string }> = [
  { code: 'ALL', labelAr: 'الكل', labelEn: 'All' },
  { code: 'E', labelAr: 'عمل', labelEn: 'Work' },
  { code: 'V', labelAr: 'قيمة', labelEn: 'Value' },
  { code: 'R', labelAr: 'علاقات', labelEn: 'Relations' },
  { code: 'S', labelAr: 'رياضة', labelEn: 'Self/Sport' },
  { code: 'SC', labelAr: 'روحي', labelEn: 'Spiritual' },
  { code: 'UNTAGGED', labelAr: 'بدون تاق', labelEn: 'Untagged' }
];

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  uid,
  lang,
  onNavigateToDate
}) => {
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<TagCode | 'ALL' | 'UNTAGGED'>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('date-desc');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQuery('');
      setSelectedTag('ALL');
      setSortMode('date-desc');
      setExpandedGroups({});
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Build index on open or when storage changes
  const fullIndex = useMemo(() => {
    if (!isOpen) return [];
    return buildSearchIndex(uid, lang);
  }, [isOpen, uid, lang]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    const effectiveTag = selectedTag === 'UNTAGGED' ? ('' as TagCode) : selectedTag;
    return querySearchIndex(fullIndex, query, effectiveTag);
  }, [fullIndex, query, selectedTag]);

  // Sort entries
  const sortedEntries = useMemo(() => {
    return sortSearchEntries(filteredEntries, sortMode);
  }, [filteredEntries, sortMode]);

  // Frequency groups
  const frequencyGroups = useMemo(() => {
    if (sortMode !== 'frequency') return [];
    return buildFrequencyGroups(filteredEntries);
  }, [filteredEntries, sortMode]);

  // Total unique dates in results
  const uniqueDatesCount = useMemo(() => {
    const set = new Set<string>();
    filteredEntries.forEach((e) => {
      if (e.date) set.add(e.date);
    });
    return set.size;
  }, [filteredEntries]);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const toggleGroupExpand = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-150">
        
        {/* Header Search Bar */}
        <div className="p-4 border-b border-[var(--line)] flex flex-col gap-3 bg-[var(--card)]">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 flex items-center">
              <Search className="w-5 h-5 absolute start-3.5 text-indigo-500 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  lang === 'ar'
                    ? 'ابحث في كافة الأسابيع السابقة (مهمة، مشروع، تاريخ...)'
                    : 'Search across all past weeks (tasks, projects, dates...)'
                }
                className="w-full ps-11 pe-10 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-sm text-[var(--ink)] placeholder-[var(--ink-soft)] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute end-3 text-[var(--ink-soft)] hover:text-rose-500 p-1 rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--ink-soft)] hover:text-rose-500 hover:bg-[var(--bg)] border border-[var(--line)] transition-all cursor-pointer"
              title={lang === 'ar' ? 'إغلاق (Esc)' : 'Close (Esc)'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tag Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
            <div className="flex items-center gap-1 text-[11px] font-bold text-[var(--ink-soft)] me-1 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'التصنيف:' : 'Tag:'}</span>
            </div>
            {TAG_KEYS.map((t) => {
              const isSelected = selectedTag === t.code;
              const tagCfg = t.code !== 'ALL' && t.code !== 'UNTAGGED' ? TAGS_CONFIG[t.code as TagCode] : null;

              return (
                <button
                  key={t.code}
                  type="button"
                  onClick={() => setSelectedTag(t.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-2xs'
                      : 'border-[var(--line)] bg-[var(--bg)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:border-indigo-400'
                  }`}
                >
                  {tagCfg && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: isSelected ? '#fff' : tagCfg.color }}
                    />
                  )}
                  <span>{lang === 'ar' ? t.labelAr : t.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* Stats & Sort Selector Bar */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--line)]/50">
            <div className="text-[var(--ink-soft)] font-medium">
              {sortMode === 'frequency' ? (
                <span>
                  {lang === 'ar'
                    ? `🔥 ${frequencyGroups.length} نشاطاً فريداً مكرراً ${filteredEntries.length} مرة`
                    : `🔥 ${frequencyGroups.length} unique activities across ${filteredEntries.length} logs`}
                </span>
              ) : (
                <span>
                  {lang === 'ar'
                    ? `📋 وجدنا ${filteredEntries.length} تسجيلاً عبر ${uniqueDatesCount} يوماً`
                    : `📋 Found ${filteredEntries.length} logs across ${uniqueDatesCount} days`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-[var(--ink-soft)] shrink-0" />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] text-xs font-bold rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:border-indigo-500"
              >
                <option value="date-desc">{lang === 'ar' ? '📅 الأحدث أولاً' : '📅 Newest first'}</option>
                <option value="date-asc">{lang === 'ar' ? '📅 الأقدم أولاً' : '📅 Oldest first'}</option>
                <option value="alpha-asc">{lang === 'ar' ? '🔤 أبجدياً (أ - ي)' : '🔤 Alphabetical (A-Z)'}</option>
                <option value="alpha-desc">{lang === 'ar' ? '🔤 أبجدياً (ي - أ)' : '🔤 Alphabetical (Z-A)'}</option>
                <option value="frequency">{lang === 'ar' ? '🔥 الأكثر استخداماً وتكراراً' : '🔥 Most Frequent'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
          {sortMode === 'frequency' ? (
            /* Frequency Grouped Mode */
            frequencyGroups.length === 0 ? (
              <div className="py-16 text-center text-[var(--ink-soft)] flex flex-col items-center gap-3">
                <Search className="w-10 h-10 opacity-30 text-indigo-500" />
                <p className="text-sm font-medium">{lang === 'ar' ? 'لا توجد نتائج مطابقة لبحثك' : 'No matching results found'}</p>
              </div>
            ) : (
              frequencyGroups.map((group) => {
                const isExpanded = !!expandedGroups[group.normalizedKey];
                return (
                  <div
                    key={group.normalizedKey}
                    className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3 flex flex-col gap-2 transition-all hover:border-indigo-300 dark:hover:border-indigo-700 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs shrink-0">
                          {group.count}×
                        </span>
                        <span className="font-bold text-sm text-[var(--ink)] truncate" title={group.representativeText}>
                          {group.representativeText}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {group.tags.map((tg) => {
                          const cfg = tg ? TAGS_CONFIG[tg] : null;
                          if (!cfg) return null;
                          return (
                            <span
                              key={tg}
                              className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs"
                              style={{ backgroundColor: cfg.color }}
                            >
                              {tg}
                            </span>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => handleCopyText(group.representativeText, group.normalizedKey)}
                          className="p-1.5 rounded-lg text-[var(--ink-soft)] hover:text-indigo-600 hover:bg-[var(--card)] transition-colors cursor-pointer"
                          title={lang === 'ar' ? 'نسخ النص' : 'Copy text'}
                        >
                          {copiedId === group.normalizedKey ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleGroupExpand(group.normalizedKey)}
                          className="p-1.5 rounded-lg text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--card)] transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded instances list */}
                    {isExpanded && (
                      <div className="mt-2 pt-2 border-t border-[var(--line)]/60 flex flex-col gap-1.5 ps-3">
                        <span className="text-[10px] font-bold text-[var(--ink-soft)]">
                          {lang === 'ar' ? 'سجل الظهور عبر الأيام:' : 'Logged instances across dates:'}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {group.entries.map((ent) => (
                            <div
                              key={ent.id}
                              className="px-2.5 py-1 rounded-lg bg-[var(--card)] border border-[var(--line)] text-xs flex items-center gap-2"
                            >
                              <span className="font-mono text-[11px] text-[var(--ink)] font-bold">{ent.date}</span>
                              <span className="text-[10px] text-[var(--ink-soft)]">({ent.timeLabel})</span>
                              {onNavigateToDate && ent.date && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onNavigateToDate(ent.date);
                                    onClose();
                                  }}
                                  className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 p-0.5 cursor-pointer"
                                  title={lang === 'ar' ? 'انتقال إلى هذا اليوم' : 'Jump to date'}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : (
            /* Standard Chronological / Alphabetical List */
            sortedEntries.length === 0 ? (
              <div className="py-16 text-center text-[var(--ink-soft)] flex flex-col items-center gap-3">
                <Search className="w-10 h-10 opacity-30 text-indigo-500" />
                <p className="text-sm font-medium">{lang === 'ar' ? 'لا توجد نتائج مطابقة لبحثك' : 'No matching results found'}</p>
                <p className="text-xs text-[var(--ink-soft)]/70">
                  {lang === 'ar' ? 'جرب البحث بكلمة أخرى أو تغيير تاق الفلترة' : 'Try searching for other keywords or tags'}
                </p>
              </div>
            ) : (
              sortedEntries.map((item) => {
                const tagCfg = item.tag ? TAGS_CONFIG[item.tag] : null;

                return (
                  <div
                    key={item.id}
                    className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3 flex items-center justify-between gap-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-2xs group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Date & Time Badge */}
                      <div className="flex flex-col shrink-0 text-start min-w-[90px]">
                        <span className="text-[11px] font-mono font-bold text-[var(--ink)] flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span>{item.date || '—'}</span>
                        </span>
                        <span className="text-[10px] text-[var(--ink-soft)] flex items-center gap-1">
                          <Clock className="w-3 h-3 opacity-60 shrink-0" />
                          <span>{item.timeLabel}</span>
                        </span>
                      </div>

                      {/* Text Entry */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-semibold text-[var(--ink)] break-words">
                          {item.text}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Tag Badge */}
                      {tagCfg ? (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs"
                          style={{ backgroundColor: tagCfg.color }}
                          title={tagCfg.fullTitle[lang]}
                        >
                          {item.tag} - {tagCfg.fullTitle[lang]}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] text-[var(--ink-soft)] bg-[var(--card)] border border-[var(--line)]">
                          —
                        </span>
                      )}

                      {/* Copy Button */}
                      <button
                        type="button"
                        onClick={() => handleCopyText(item.text, item.id)}
                        className="p-1.5 rounded-lg text-[var(--ink-soft)] hover:text-indigo-600 hover:bg-[var(--card)] transition-colors cursor-pointer"
                        title={lang === 'ar' ? 'نسخ النص' : 'Copy text'}
                      >
                        {copiedId === item.id ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      {/* Jump to Date Button */}
                      {onNavigateToDate && item.date && (
                        <button
                          type="button"
                          onClick={() => {
                            onNavigateToDate(item.date);
                            onClose();
                          }}
                          className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:bg-[var(--card)] transition-colors cursor-pointer"
                          title={lang === 'ar' ? 'عرض هذا اليوم في الجدول' : 'View this day in schedule'}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--line)] bg-[var(--card)] flex items-center justify-between text-xs text-[var(--ink-soft)]">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--line)] font-mono text-[10px]">
              Esc
            </span>
            <span>{lang === 'ar' ? 'للإغلاق السريع' : 'to close'}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--bg)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--ink)] font-semibold cursor-pointer transition-all"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
