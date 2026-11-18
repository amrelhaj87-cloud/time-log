/**
 * searchUtils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Smart Global Search & Indexing Engine across all local weeks, golden goals,
 * and todo inbox items.
 *
 * FEATURES:
 *  - Full-text instant search across all historical records
 *  - Filter by Tag (E / V / R / S / SC)
 *  - 5 Sorting modes: Date (desc/asc), Alphabetical (asc/desc), Frequency
 *  - Frequency grouping ("Most used / الأثر تكراراً")
 *  - Extensibility hook for future fuzzy matching / typo tolerance
 */

import { TagCode, WeekData, TodoItem } from '../types';
import { HOUR_LABELS } from '../constants/config';

export interface SearchEntry {
  id: string;
  date: string;            // 'YYYY-MM-DD'
  timeLabel: string;       // e.g. '10 ص' or '10 AM' or 'الهدف الذهبي'
  hourKey: string;         // '10am', etc., or empty for golden/todo
  text: string;
  tag: TagCode;
  source: 'hour' | 'golden' | 'todo';
  weekKey: string;         // 'YYYY-MM-DD' monday of week
}

export interface FrequencyGroup {
  normalizedKey: string;
  representativeText: string;
  count: number;
  tags: TagCode[];
  entries: SearchEntry[];
}

export type SortMode = 'date-desc' | 'date-asc' | 'alpha-asc' | 'alpha-desc' | 'frequency';

/**
 * Builds an in-memory search index by scanning all local storage week records
 * and the todo inbox. Fast and responsive for thousands of entries.
 */
export function buildSearchIndex(uid: string | null = null, lang: 'ar' | 'en' = 'ar'): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const seenIds = new Set<string>();

  // 1. Scan all weeks in localStorage
  const prefix = `time_log_week_${uid ?? 'guest'}_`;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(prefix)) continue;

    const monKey = k.slice(prefix.length);
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed: WeekData = JSON.parse(raw);
      if (!parsed || !parsed.days || typeof parsed.days !== 'object') continue;

      for (const [dateStr, dayData] of Object.entries(parsed.days)) {
        if (!dayData) continue;

        // Hour entries
        if (dayData.hours && typeof dayData.hours === 'object') {
          for (const [hourKey, entry] of Object.entries(dayData.hours)) {
            if (entry && entry.text && entry.text.trim()) {
              const id = `hour_${dateStr}_${hourKey}`;
              if (!seenIds.has(id)) {
                seenIds.add(id);
                const timeLabel = HOUR_LABELS[lang]?.[hourKey] || hourKey;
                entries.push({
                  id,
                  date: dateStr,
                  timeLabel,
                  hourKey,
                  text: entry.text.trim(),
                  tag: entry.tag || '',
                  source: 'hour',
                  weekKey: monKey
                });
              }
            }
          }
        }

        // Golden Goal entry
        if (dayData.goldenGoal && dayData.goldenGoal.text && dayData.goldenGoal.text.trim()) {
          const id = `golden_${dateStr}`;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            entries.push({
              id,
              date: dateStr,
              timeLabel: lang === 'ar' ? '🌟 الهدف الذهبي' : '🌟 Golden Goal',
              hourKey: '',
              text: dayData.goldenGoal.text.trim(),
              tag: dayData.goldenGoal.tag || '',
              source: 'golden',
              weekKey: monKey
            });
          }
        }
      }
    } catch {
      // Ignore unparseable entries
    }
  }

  // 2. Scan Todo Inbox
  try {
    const rawInbox = localStorage.getItem('time_log_todo_inbox');
    if (rawInbox) {
      const todos: TodoItem[] = JSON.parse(rawInbox);
      if (Array.isArray(todos)) {
        todos.forEach((td) => {
          if (td.text && td.text.trim()) {
            const dateStr = td.createdAt ? new Date(td.createdAt).toISOString().slice(0, 10) : '';
            const id = `todo_${td.id}`;
            if (!seenIds.has(id)) {
              seenIds.add(id);
              entries.push({
                id,
                date: dateStr,
                timeLabel: lang === 'ar' ? '📥 صندوق المهام' : '📥 Todo Inbox',
                hourKey: '',
                text: td.text.trim(),
                tag: td.tag || '',
                source: 'todo',
                weekKey: ''
              });
            }
          }
        });
      }
    }
  } catch {}

  return entries;
}

/**
 * Filter entries by text query (case-insensitive substring match)
 * and optional tag filter.
 */
export function querySearchIndex(
  index: SearchEntry[],
  query: string,
  tagFilter: TagCode | 'ALL' = 'ALL'
): SearchEntry[] {
  const normalizedQuery = query.trim().toLowerCase();

  return index.filter((entry) => {
    // 1. Tag filter
    if (tagFilter !== 'ALL' && entry.tag !== tagFilter) {
      return false;
    }

    // 2. Query filter (empty query returns everything matching tag)
    if (!normalizedQuery) {
      return true;
    }

    const textMatch = entry.text.toLowerCase().includes(normalizedQuery);
    const dateMatch = entry.date.includes(normalizedQuery);
    return textMatch || dateMatch;
  });
}

/**
 * Group search entries by normalized text frequency to find the most-used tasks/activities.
 */
export function buildFrequencyGroups(entries: SearchEntry[]): FrequencyGroup[] {
  const map = new Map<string, FrequencyGroup>();

  for (const item of entries) {
    const norm = item.text.trim().toLowerCase();
    if (!norm) continue;

    const existing = map.get(norm);
    if (existing) {
      existing.count += 1;
      existing.entries.push(item);
      if (item.tag && !existing.tags.includes(item.tag)) {
        existing.tags.push(item.tag);
      }
    } else {
      map.set(norm, {
        normalizedKey: norm,
        representativeText: item.text.trim(),
        count: 1,
        tags: item.tag ? [item.tag] : [],
        entries: [item]
      });
    }
  }

  // Sort groups by count descending
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

/**
 * Sort search entries according to chosen SortMode.
 */
export function sortSearchEntries(entries: SearchEntry[], mode: SortMode): SearchEntry[] {
  const copy = [...entries];

  switch (mode) {
    case 'date-desc':
      return copy.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.hourKey || '').localeCompare(a.hourKey || ''));
    case 'date-asc':
      return copy.sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.hourKey || '').localeCompare(b.hourKey || ''));
    case 'alpha-asc':
      return copy.sort((a, b) => a.text.localeCompare(b.text, 'ar', { sensitivity: 'base' }));
    case 'alpha-desc':
      return copy.sort((a, b) => b.text.localeCompare(a.text, 'ar', { sensitivity: 'base' }));
    case 'frequency':
      // Handled separately via buildFrequencyGroups in UI
      return copy;
    default:
      return copy;
  }
}

/**
 * Future Hook: Stub for fuzzy search (Levenshtein distance / ngram match / typo tolerance).
 * Ready to be connected to a library or algorithm without breaking the UI API.
 */
export function fuzzySearchStub(index: SearchEntry[], query: string, _threshold = 0.7): SearchEntry[] {
  // Currently falls back to standard substring match
  return querySearchIndex(index, query, 'ALL');
}
