import type { ThemePalette } from '../types';

export interface ThemePaletteDefinition {
  id: ThemePalette;
  label: { ar: string; en: string };
  /** Swatch colors for the picker: accent dot + light/dark surface. */
  swatch: { accent: string; light: string; dark: string };
  /** Browser UI color (<meta name="theme-color">) for this palette. */
  metaColor: string;
}

/** Color themes shown in Settings. CSS for each lives in src/themes.css. */
export const THEME_PALETTES: ThemePaletteDefinition[] = [
  { id: 'classic', label: { ar: 'كلاسيكي', en: 'Classic' }, swatch: { accent: '#4F46E5', light: '#F8FAFC', dark: '#12151E' }, metaColor: '#4F46E5' },
  { id: 'ocean', label: { ar: 'محيط', en: 'Ocean' }, swatch: { accent: '#0284C7', light: '#F0F7FB', dark: '#0C1A26' }, metaColor: '#0284C7' },
  { id: 'forest', label: { ar: 'غابة', en: 'Forest' }, swatch: { accent: '#0D9488', light: '#F2F8F6', dark: '#0E1C18' }, metaColor: '#0D9488' },
  { id: 'sunset', label: { ar: 'غروب', en: 'Sunset' }, swatch: { accent: '#EA580C', light: '#FFF8F3', dark: '#1E130D' }, metaColor: '#EA580C' },
  { id: 'rose', label: { ar: 'وردي', en: 'Rose' }, swatch: { accent: '#E11D48', light: '#FDF6F8', dark: '#1E0F16' }, metaColor: '#E11D48' },
  { id: 'paper', label: { ar: 'ورقي', en: 'Paper' }, swatch: { accent: '#D97706', light: '#F7F3EA', dark: '#1F1A13' }, metaColor: '#B45309' }
];

export const DEFAULT_THEME_PALETTE: ThemePalette = 'classic';

export function isThemePalette(value: unknown): value is ThemePalette {
  return typeof value === 'string' && THEME_PALETTES.some((p) => p.id === value);
}
