export type TagCode = '' | 'E' | 'V' | 'R' | 'S' | 'SC' | 'SL';

export interface TodoItem {
  id: string;
  text: string;
  tag: TagCode;
  done: boolean;
  createdAt: number;
}

export interface HourEntry {
  text: string;
  tag: TagCode;
}

export interface GoalItem {
  text: string;
  done: boolean;
  tag: TagCode;
}

export interface DayData {
  hours: Record<string, HourEntry>;
  goldenGoal: GoalItem;
  priorities: {
    q1: GoalItem[];
    q2: GoalItem[];
    q3: GoalItem[];
    q4: GoalItem[];
  };
}

export interface WeekData {
  days: Record<string, DayData>;
}

export interface SleepSettings {
  enabled: boolean;
  start: number; // 0-23 (e.g. 23 for 11pm)
  end: number;   // 0-23 (e.g. 7 for 7am)
  onboarded: boolean;
}

export type AgeDisplayOpt = 'none' | 'days' | 'years' | 'compass';
export type WeekStartDay = 'saturday' | 'sunday' | 'monday';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface UserPreferences {
  sleepWindow: SleepSettings;
  birthDate: string;
  ageDisplayOpt: AgeDisplayOpt;
  weekStartDay?: WeekStartDay;
  devToolsEnabled: boolean;
  calSyncEnabled: boolean;
  darkMode: boolean;
  themeMode?: ThemeMode;
  isDetailedView?: boolean;
  lang: 'ar' | 'en';
}

export interface TagDefinition {
  code: TagCode;
  fullTitle: { ar: string; en: string };
  desc: { ar: string; en: string };
  color: string;
  bgTint: string;
}

export interface PeriodDefinition {
  id: 'morning' | 'noon' | 'evening' | 'night';
  icon: string;
  keys: string[];
  label: { ar: string; en: string };
}
