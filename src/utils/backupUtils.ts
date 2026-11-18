/**
 * backupUtils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Full backup / restore / cloud-sync utilities for Time Log App.
 *
 * SCHEMA VERSION HISTORY:
 *   1 → Initial full backup (weeks + todoInbox + preferences)
 *
 * HOW TO ADD NEW DATA IN THE FUTURE:
 *   1. Add a field to `FullBackup` interface.
 *   2. Add one line in `gatherFullBackup()` to collect it.
 *   3. Add one line in `restoreFullBackup()` to apply it.
 *   4. Bump CURRENT_SCHEMA_VERSION and add a migration block in `migrateBackupIfNeeded()`.
 */

import { WeekData, TodoItem, SleepSettings, AgeDisplayOpt, WeekStartDay, ThemeMode, TagTargets } from '../types';
import { DEFAULT_TAG_TARGETS } from '../constants/config';

// ─── Constants ───────────────────────────────────────────────────────────────

export const CURRENT_SCHEMA_VERSION = 1;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BackupPreferences {
  tagTargets: TagTargets;
  sleepSettings: SleepSettings | null;
  sleepExceptionDays: Record<string, boolean>;
  weekStartDay: WeekStartDay;
  themeMode: ThemeMode;
  lang: 'ar' | 'en';
  birthDate: string;
  ageDisplayOpt: AgeDisplayOpt;
  isDetailedView: boolean;
  showStreakBadge: boolean;
  showAgeBadge: boolean;
  showFocusModeButton: boolean;
  showGoldenGoal: boolean;
  showPriorityMatrix: boolean;
  showTodoInbox: boolean;
  morningNudgeEnabled: boolean;
}

export interface FullBackup {
  appVersion: string;
  exportedAt: string;           // ISO 8601
  schemaVersion: number;        // bump when structure changes
  weeks: Record<string, WeekData>;        // monKey → WeekData
  todoInbox: TodoItem[];
  preferences: BackupPreferences;
}

// ─── Helper: read all week keys from localStorage ────────────────────────────

function getAllLocalWeekKeys(uid: string | null): string[] {
  const prefix = `time_log_week_${uid ?? 'guest'}_`;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) keys.push(k);
  }
  return keys;
}

// ─── gatherFullBackup ────────────────────────────────────────────────────────

/**
 * Collects ALL weeks from localStorage, the todo inbox, and all user
 * preferences into a single FullBackup object ready for JSON export.
 *
 * @param uid  Firebase user uid — pass null for guest mode.
 * @param appVersion  Current APP_VERSION string from config.ts.
 */
export function gatherFullBackup(uid: string | null, appVersion: string): FullBackup {
  // --- Weeks ---
  const weeks: Record<string, WeekData> = {};
  const weekKeys = getAllLocalWeekKeys(uid);
  for (const k of weekKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed: WeekData = JSON.parse(raw);
      // Extract the monKey from the localStorage key: time_log_week_{uid}_{monKey}
      const prefix = `time_log_week_${uid ?? 'guest'}_`;
      const monKey = k.slice(prefix.length);
      if (monKey && parsed && typeof parsed.days === 'object') {
        weeks[monKey] = parsed;
      }
    } catch {
      // Skip corrupted week entries silently
    }
  }

  // --- Todo Inbox ---
  let todoInbox: TodoItem[] = [];
  try {
    const raw = localStorage.getItem('time_log_todo_inbox');
    if (raw) todoInbox = JSON.parse(raw);
  } catch {}

  // --- Preferences ---
  let sleepSettings: SleepSettings | null = null;
  try {
    const raw = localStorage.getItem('sleepSettings');
    if (raw) sleepSettings = JSON.parse(raw);
  } catch {}

  let sleepExceptionDays: Record<string, boolean> = {};
  try {
    const raw = localStorage.getItem('sleepExceptionDays');
    if (raw) sleepExceptionDays = JSON.parse(raw);
  } catch {}

  let tagTargets: TagTargets = { ...DEFAULT_TAG_TARGETS };
  try {
    const raw = localStorage.getItem('tagTargets');
    if (raw) tagTargets = { ...DEFAULT_TAG_TARGETS, ...JSON.parse(raw) };
  } catch {}

  const preferences: BackupPreferences = {
    tagTargets,
    sleepSettings,
    sleepExceptionDays,
    weekStartDay: (localStorage.getItem('weekStartDay') as WeekStartDay) || 'saturday',
    themeMode: (localStorage.getItem('themeMode') as ThemeMode) || 'light',
    lang: (localStorage.getItem('lang') as 'ar' | 'en') || 'ar',
    birthDate: localStorage.getItem('userBirthDate') || '',
    ageDisplayOpt: (localStorage.getItem('ageDisplayOpt') as AgeDisplayOpt) || 'none',
    isDetailedView: localStorage.getItem('isDetailedView') === 'true',
    showStreakBadge: localStorage.getItem('showStreakBadge') !== 'false',
    showAgeBadge: localStorage.getItem('showAgeBadge') === 'true',
    showFocusModeButton: localStorage.getItem('showFocusModeButton') === 'true',
    showGoldenGoal: localStorage.getItem('showGoldenGoal') !== 'false',
    showPriorityMatrix: localStorage.getItem('showPriorityMatrix') !== 'false',
    showTodoInbox: localStorage.getItem('showTodoInbox') !== 'false',
    morningNudgeEnabled: localStorage.getItem('morningNudgeEnabled') === 'true',
  };

  return {
    appVersion,
    exportedAt: new Date().toISOString(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    weeks,
    todoInbox,
    preferences,
  };
}

// ─── validateBackupSchema ─────────────────────────────────────────────────────

/**
 * Returns true if `data` looks like a valid FullBackup.
 * Returns false if it's corrupted or a legacy single-week backup.
 */
export function validateBackupSchema(data: unknown): data is FullBackup {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.schemaVersion === 'number' &&
    typeof d.exportedAt === 'string' &&
    d.weeks !== null &&
    typeof d.weeks === 'object' &&
    Array.isArray(d.todoInbox)
  );
}

/**
 * Returns true if `data` is a legacy single-week backup ({ days: {...} }).
 */
export function isLegacyWeekBackup(data: unknown): data is WeekData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return d.days !== undefined && typeof d.days === 'object' && !('weeks' in d);
}

// ─── migrateBackupIfNeeded ────────────────────────────────────────────────────

/**
 * Applies forward migrations when restoring an older backup.
 * Extend this function as schemaVersion increases.
 */
export function migrateBackupIfNeeded(data: FullBackup): FullBackup {
  let migrated = { ...data };

  // Migration: schema 0 → 1 (pre-schemaVersion backups don't exist yet, placeholder)
  // if (migrated.schemaVersion < 1) { ... migrated.schemaVersion = 1; }

  // Future migrations go here:
  // if (migrated.schemaVersion < 2) { migrated.newField = defaultValue; migrated.schemaVersion = 2; }

  return migrated;
}

// ─── restoreFullBackup ────────────────────────────────────────────────────────

export interface RestoreCallbacks {
  uid: string | null;
  /** Called once per week restored — use to update Firestore if needed */
  onWeekRestored?: (monKey: string, weekData: WeekData) => void;
  /** Called with restored inbox items */
  onInboxRestored?: (items: TodoItem[]) => void;
  /** Called with the restored preferences object */
  onPrefsRestored?: (prefs: BackupPreferences) => void;
}

/**
 * Restores a full backup to localStorage (and optionally triggers callbacks
 * to update React state and Firestore).
 */
export function restoreFullBackup(data: FullBackup, callbacks: RestoreCallbacks): void {
  const migrated = migrateBackupIfNeeded(data);
  const prefix = `time_log_week_${callbacks.uid ?? 'guest'}_`;

  // 1. Restore all weeks to localStorage
  for (const [monKey, weekData] of Object.entries(migrated.weeks)) {
    if (!monKey || !weekData || typeof weekData.days !== 'object') continue;
    const localKey = `${prefix}${monKey}`;
    localStorage.setItem(localKey, JSON.stringify(weekData));
    callbacks.onWeekRestored?.(monKey, weekData);
  }

  // 2. Restore todo inbox
  localStorage.setItem('time_log_todo_inbox', JSON.stringify(migrated.todoInbox));
  callbacks.onInboxRestored?.(migrated.todoInbox);

  // 3. Restore preferences
  const p = migrated.preferences;
  if (p.tagTargets) localStorage.setItem('tagTargets', JSON.stringify(p.tagTargets));
  if (p.sleepSettings) localStorage.setItem('sleepSettings', JSON.stringify(p.sleepSettings));
  if (p.sleepExceptionDays) localStorage.setItem('sleepExceptionDays', JSON.stringify(p.sleepExceptionDays));
  localStorage.setItem('weekStartDay', p.weekStartDay || 'saturday');
  localStorage.setItem('themeMode', p.themeMode || 'light');
  localStorage.setItem('lang', p.lang || 'ar');
  if (p.birthDate) localStorage.setItem('userBirthDate', p.birthDate);
  localStorage.setItem('ageDisplayOpt', p.ageDisplayOpt || 'none');
  localStorage.setItem('isDetailedView', String(p.isDetailedView ?? false));
  localStorage.setItem('showStreakBadge', String(p.showStreakBadge ?? true));
  localStorage.setItem('showAgeBadge', String(p.showAgeBadge ?? false));
  localStorage.setItem('showFocusModeButton', String(p.showFocusModeButton ?? false));
  localStorage.setItem('showGoldenGoal', String(p.showGoldenGoal ?? true));
  localStorage.setItem('showPriorityMatrix', String(p.showPriorityMatrix ?? true));
  localStorage.setItem('showTodoInbox', String(p.showTodoInbox ?? true));
  localStorage.setItem('morningNudgeEnabled', String(p.morningNudgeEnabled ?? false));

  callbacks.onPrefsRestored?.(p);
}

// ─── syncAllWeeksToCloud ──────────────────────────────────────────────────────

export interface SyncResult {
  synced: number;
  skipped: number;
  errors: number;
}

/**
 * Pushes all locally-stored weeks to Firestore.
 * Only runs when user is logged in and db is available.
 * Skips entirely empty weeks (no entries).
 *
 * @param uid       Firebase user uid
 * @param db        Firestore db instance (typed as `any` to avoid importing firebase here)
 * @param docFn     Firestore `doc` function
 * @param setDocFn  Firestore `setDoc` function
 */
export async function syncAllWeeksToCloud(
  uid: string,
  db: unknown,
  docFn: (...args: unknown[]) => unknown,
  setDocFn: (ref: unknown, data: unknown) => Promise<void>
): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, skipped: 0, errors: 0 };
  if (!uid || !db) return result;

  const prefix = `time_log_week_${uid}_`;
  const weekKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) weekKeys.push(k);
  }

  for (const k of weekKeys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) { result.skipped++; continue; }

      const parsed: WeekData = JSON.parse(raw);
      // Skip completely empty weeks
      const hasAnyEntry = Object.values(parsed.days || {}).some(day =>
        Object.values(day.hours || {}).some(h => h.text?.trim()) ||
        day.goldenGoal?.text?.trim()
      );
      if (!hasAnyEntry) { result.skipped++; continue; }

      const monKey = k.slice(prefix.length);
      const docRef = docFn(
        db,
        'artifacts', 'time-log-app', 'users', uid, 'weeks', monKey
      );
      await setDocFn(docRef, { json: raw, updatedAt: new Date().toISOString() });
      result.synced++;
    } catch {
      result.errors++;
    }
  }

  return result;
}
