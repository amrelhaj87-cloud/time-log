/**
 * searchUtils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Smart Global Search & Indexing Engine across all local weeks, golden goals,
 * and todo inbox items.
 *
 * FEATURES:
 *  - Full-text instant search across all historical records
 *  - Filter by Tag (E / V / R / S / SC)
 *  - 5 Sorting modes: Relevance, Date (desc/asc), Alphabetical (asc/desc), Frequency
 *  - Frequency grouping ("Most used / الأثر تكراراً")
 *  - Fuzzy matching: typo tolerance for Arabic (hamza/alef/yaa/taa-marbuta,
 *    diacritics) and English, with ranked results (#17)
 */

import { TagCode, WeekData, TodoItem } from '../types';
import { HOUR_LABELS } from '../constants/config';

/** How a query matched an entry — used for ranking and for the UI badge. */
export type MatchKind = 'all' | 'date' | 'word' | 'text' | 'fuzzy';

export interface SearchEntry {
  id: string;
  date: string;            // 'YYYY-MM-DD'
  timeLabel: string;       // e.g. '10 ص' or '10 AM' or 'الهدف الذهبي'
  hourKey: string;         // '10am', etc., or empty for golden/todo
  text: string;
  tag: TagCode;
  source: 'hour' | 'golden' | 'todo';
  weekKey: string;         // 'YYYY-MM-DD' monday of week
  /** Set only when a text query is present. */
  matchKind?: MatchKind;
  /** 0..1 relevance score (higher is better), set with `matchKind`. */
  matchScore?: number;
}

export interface FrequencyGroup {
  normalizedKey: string;
  representativeText: string;
  count: number;
  tags: TagCode[];
  entries: SearchEntry[];
}

export type SortMode = 'relevance' | 'date-desc' | 'date-asc' | 'alpha-asc' | 'alpha-desc' | 'frequency';

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
 * Normalizes Arabic + English text for tolerant comparisons:
 * strips diacritics/tatweel, unifies alef/yaa/hamza/taa-marbuta variants,
 * lowercases and collapses punctuation so "المشروع" matches "المشروعُ".
 */
const ARABIC_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

export function normalizeSearchText(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(ARABIC_MARKS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Levenshtein distance with an early exit once the distance provably exceeds
 * `max`. Returns `max + 1` when the two strings are further apart than allowed.
 */
export function editDistanceWithin(a: string, b: string, max: number): number {
  if (a === b) return 0;
  if (max < 0 || Math.abs(a.length - b.length) > max) return max + 1;

  const n = b.length;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    const swap = prev;
    prev = curr;
    curr = swap;
  }
  return prev[n] > max ? max + 1 : prev[n];
}

/** How many typos we allow for a single query token, by its length. */
function tokenMaxDistance(token: string): number {
  if (token.length <= 2) return 0; // too short to guess safely
  if (token.length <= 4) return 1;
  if (token.length <= 7) return 2;
  return 3;
}

function bestTokenMatch(word: string, token: string, allowFuzzy: boolean): { score: number; kind: MatchKind } | null {
  if (word === token) return { score: 1, kind: 'word' };
  if (word.startsWith(token)) return { score: 0.96, kind: 'word' };
  if (word.includes(token)) return { score: 0.86, kind: 'text' };
  if (!allowFuzzy) return null;

  const max = tokenMaxDistance(token);
  if (max === 0) return null;

  let best = max + 1;
  if (word.length <= token.length + max) {
    best = Math.min(best, editDistanceWithin(word, token, max));
  }
  // Allow a typo inside a longer word by sliding a window the size of the token.
  if (token.length >= 4) {
    const lastStart = Math.min(3, word.length - token.length);
    for (let start = 0; start <= lastStart; start++) {
      const d = editDistanceWithin(word.slice(start, start + token.length), token, max);
      if (d < best) best = d;
      if (best === 0) break;
    }
  }

  if (best <= max) return { score: Math.max(0.45, 0.8 - best * 0.1), kind: 'fuzzy' };
  return null;
}

/**
 * Matches one entry's text against an already-normalized query.
 * Every query token must match (AND semantics); the score is the average of
 * the per-token scores and the kind is the weakest match found.
 */
export function matchSearchText(
  text: string,
  normalizedQuery: string,
  allowFuzzy = false
): { score: number; kind: MatchKind } | null {
  if (!normalizedQuery) return { score: 0, kind: 'all' };

  const normText = normalizeSearchText(text);
  if (!normText) return null;

  const tokens = normalizedQuery.split(' ').filter(Boolean);
  if (tokens.length === 0) return { score: 0, kind: 'all' };

  const words = normText.split(' ');
  const rank: Record<MatchKind, number> = { all: 0, fuzzy: 1, date: 2, text: 3, word: 4 };

  let total = 0;
  let kind: MatchKind = 'word';

  for (const token of tokens) {
    let best: { score: number; kind: MatchKind } | null = null;
    for (const word of words) {
      const m = bestTokenMatch(word, token, allowFuzzy);
      if (m && (!best || m.score > best.score)) best = m;
      if (best && best.score === 1) break;
    }
    // Phrase fallback for tokens spanning several words (e.g. "مشروع الموقع").
    if (!best && normText.includes(token)) best = { score: 0.8, kind: 'text' };
    if (!best) return null;

    total += best.score;
    if (rank[best.kind] < rank[kind]) kind = best.kind;
  }

  return { score: total / tokens.length, kind };
}

/**
 * Filter entries by text query and optional tag filter.
 * With `fuzzy: true`, entries whose words are within a few typos of a query
 * token are included as well (ranked lower than exact matches).
 */
export function querySearchIndex(
  index: SearchEntry[],
  query: string,
  tagFilter: TagCode | 'ALL' = 'ALL',
  options: { fuzzy?: boolean } = {}
): SearchEntry[] {
  const rawQuery = query.trim().toLowerCase();
  const normalizedQuery = normalizeSearchText(query);
  const allowFuzzy = options.fuzzy ?? false;

  const results: SearchEntry[] = [];

  for (const entry of index) {
    // 1. Tag filter
    if (tagFilter !== 'ALL' && entry.tag !== tagFilter) continue;

    // 2. Empty query returns everything matching the tag
    if (!rawQuery) {
      results.push(entry);
      continue;
    }

    // 3. Date match (e.g. "2026-11" or "20")
    if (entry.date && entry.date.includes(rawQuery)) {
      results.push({ ...entry, matchKind: 'date', matchScore: 0.9 });
      continue;
    }

    // 4. Text match — fuzzy only when enabled
    const match = matchSearchText(entry.text, normalizedQuery, allowFuzzy);
    if (match && (match.kind !== 'fuzzy' || allowFuzzy)) {
      results.push({ ...entry, matchKind: match.kind, matchScore: match.score });
    }
  }

  return results;
}

/** Convenience wrapper: always tolerate typos. */
export function fuzzySearch(index: SearchEntry[], query: string, tagFilter: TagCode | 'ALL' = 'ALL'): SearchEntry[] {
  return querySearchIndex(index, query, tagFilter, { fuzzy: true });
}

/** Number of results that only matched thanks to typo tolerance. */
export function countFuzzyMatches(entries: SearchEntry[]): number {
  return entries.reduce((total, entry) => (entry.matchKind === 'fuzzy' ? total + 1 : total), 0);
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
    case 'relevance':
      // Highest score first; with no query every score is 0, so this degrades
      // to newest-first (the previous default ordering).
      return copy.sort((a, b) =>
        (b.matchScore ?? 0) - (a.matchScore ?? 0) ||
        (b.date || '').localeCompare(a.date || '') ||
        (b.hourKey || '').localeCompare(a.hourKey || '')
      );
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
