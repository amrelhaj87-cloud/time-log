import { describe, it, expect } from 'vitest';
import {
  normalizeSearchText,
  editDistanceWithin,
  matchSearchText,
  querySearchIndex,
  sortSearchEntries,
  countFuzzyMatches,
  type SearchEntry
} from './searchUtils';

const entry = (id: string, text: string, date = '2026-11-20', tag: SearchEntry['tag'] = 'E'): SearchEntry => ({
  id,
  date,
  timeLabel: '10 ص',
  hourKey: '10am',
  text,
  tag,
  source: 'hour',
  weekKey: '2026-11-16'
});

describe('normalizeSearchText', () => {
  it('unifies Arabic letter variants and drops diacritics', () => {
    expect(normalizeSearchText('إدارة المُشروع')).toBe('اداره المشروع');
    expect(normalizeSearchText('أحمد')).toBe('احمد');
    expect(normalizeSearchText('مصطفى')).toBe('مصطفي');
    expect(normalizeSearchText('ملاحظة')).toBe('ملاحظه');
    expect(normalizeSearchText('مشـــروع')).toBe('مشروع');
  });

  it('lowercases, strips punctuation and collapses whitespace', () => {
    expect(normalizeSearchText('  Project: Review!!  ')).toBe('project review');
  });
});

describe('editDistanceWithin', () => {
  it('returns the real distance inside the limit', () => {
    expect(editDistanceWithin('project', 'projct', 2)).toBe(1);
    expect(editDistanceWithin('client', 'clinet', 2)).toBe(2);
    expect(editDistanceWithin('same', 'same', 0)).toBe(0);
  });

  it('gives up once the limit is exceeded', () => {
    expect(editDistanceWithin('project', 'projct', 0)).toBe(1);
    expect(editDistanceWithin('cat', 'elephant', 2)).toBeGreaterThan(2);
  });
});

describe('matchSearchText', () => {
  it('prefers word matches over substring matches', () => {
    const word = matchSearchText('مراجعة إدارة المشروع', normalizeSearchText('المشروع'));
    const text = matchSearchText('مراجعة إدارة المشروع', normalizeSearchText('شروع'));
    expect(word?.kind).toBe('word');
    expect(text?.kind).toBe('text');
    expect(word!.score).toBeGreaterThan(text!.score);
  });

  it('tolerates Arabic typos when fuzzy is allowed', () => {
    const strict = matchSearchText('اجتماع الفريق', normalizeSearchText('اجتماك'), false);
    const fuzzy = matchSearchText('اجتماع الفريق', normalizeSearchText('اجتماك'), true);
    expect(strict).toBeNull();
    expect(fuzzy?.kind).toBe('fuzzy');
  });

  it('tolerates English typos and letter swaps', () => {
    expect(matchSearchText('Design review with the client', normalizeSearchText('clinet'), true)?.kind).toBe('fuzzy');
    expect(matchSearchText('Project kickoff', normalizeSearchText('projct'), true)?.kind).toBe('fuzzy');
    // Transposition needs 2 edits, allowed for a 6-letter token.
    expect(matchSearchText('Project kickoff', normalizeSearchText('projcet'), true)?.kind).toBe('fuzzy');
  });

  it('does not guess on very short tokens', () => {
    expect(matchSearchText('go home', normalizeSearchText('do'), true)).toBeNull();
  });

  it('requires every token to match (AND semantics)', () => {
    expect(matchSearchText('تقرير المشروع الأسبوعي', normalizeSearchText('تقرير المشروع'), true)).not.toBeNull();
    expect(matchSearchText('تقرير المشروع الأسبوعي', normalizeSearchText('تقرير السيارة'), true)).toBeNull();
  });
});

describe('querySearchIndex', () => {
  const index = [
    entry('1', 'Project kickoff meeting', '2026-11-20'),
    entry('2', 'قراءة كتاب', '2026-11-19', 'S'),
    entry('3', 'مراجعة إدارة المشروع', '2026-11-18')
  ];

  it('returns everything for an empty query', () => {
    expect(querySearchIndex(index, '')).toHaveLength(3);
  });

  it('excludes fuzzy-only hits unless fuzzy is enabled', () => {
    expect(querySearchIndex(index, 'projct')).toHaveLength(0);
    const fuzzy = querySearchIndex(index, 'projct', 'ALL', { fuzzy: true });
    expect(fuzzy).toHaveLength(1);
    expect(fuzzy[0].matchKind).toBe('fuzzy');
    expect(fuzzy[0].matchScore).toBeGreaterThan(0);
  });

  it('still matches dates and keeps the tag filter', () => {
    expect(querySearchIndex(index, '2026-11-19')).toHaveLength(1);
    expect(querySearchIndex(index, 'قراءة', 'S')).toHaveLength(1);
    expect(querySearchIndex(index, 'قراءة', 'E')).toHaveLength(0);
    expect(querySearchIndex(index, 'كتاب', 'ALL', { fuzzy: true })).toHaveLength(1);
  });

  it('counts approximate matches separately', () => {
    const results = querySearchIndex(index, 'projct', 'ALL', { fuzzy: true });
    expect(countFuzzyMatches(results)).toBe(1);
    expect(countFuzzyMatches(querySearchIndex(index, 'project'))).toBe(0);
  });
});

describe('sortSearchEntries relevance', () => {
  it('ranks exact word matches above substring and fuzzy matches', () => {
    const index = [
      entry('fuzzy', 'Projcet kickoff', '2026-11-20'),
      entry('text', 'unprojected backlog', '2026-11-20'),
      entry('word', 'Project kickoff', '2026-11-01')
    ];
    const results = querySearchIndex(index, 'project', 'ALL', { fuzzy: true });
    const sorted = sortSearchEntries(results, 'relevance').map((e) => e.id);
    expect(sorted).toEqual(['word', 'text', 'fuzzy']);
  });

  it('falls back to newest-first when there is no query', () => {
    const index = [entry('old', 'a', '2026-11-01'), entry('new', 'b', '2026-11-20')];
    const sorted = sortSearchEntries(querySearchIndex(index, ''), 'relevance').map((e) => e.id);
    expect(sorted).toEqual(['new', 'old']);
  });
});
