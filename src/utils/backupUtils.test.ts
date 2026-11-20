import { describe, it, expect } from 'vitest';
import {
  validateBackupSchema,
  isLegacyWeekBackup,
  migrateBackupIfNeeded,
  CURRENT_SCHEMA_VERSION,
  type FullBackup
} from './backupUtils';

const validBackup: FullBackup = {
  appVersion: 'v4.7',
  exportedAt: new Date().toISOString(),
  schemaVersion: CURRENT_SCHEMA_VERSION,
  weeks: {},
  todoInbox: [],
  preferences: {
    tagTargets: { E: 6, V: 2, R: 3, S: 2, SC: 2 },
    sleepSettings: null,
    sleepExceptionDays: {},
    weekStartDay: 'saturday',
    themeMode: 'light',
    lang: 'ar',
    birthDate: '',
    ageDisplayOpt: 'none',
    isDetailedView: false,
    showStreakBadge: true,
    showAgeBadge: false,
    showFocusModeButton: false,
    showGoldenGoal: true,
    showPriorityMatrix: true,
    showTodoInbox: true,
    morningNudgeEnabled: false
  }
};

describe('backupUtils', () => {
  it('validates a well-formed full backup', () => {
    expect(validateBackupSchema(validBackup)).toBe(true);
  });

  it('rejects malformed or legacy payloads as full backups', () => {
    expect(validateBackupSchema({ days: {} })).toBe(false);
    expect(validateBackupSchema(null)).toBe(false);
    expect(validateBackupSchema({ ...validBackup, todoInbox: 'nope' })).toBe(false);
  });

  it('detects legacy single-week backups', () => {
    expect(isLegacyWeekBackup({ days: {} })).toBe(true);
    expect(isLegacyWeekBackup(validBackup)).toBe(false);
    expect(isLegacyWeekBackup(null)).toBe(false);
  });

  it('migrateBackupIfNeeded preserves the schema version', () => {
    expect(migrateBackupIfNeeded(validBackup).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });
});
