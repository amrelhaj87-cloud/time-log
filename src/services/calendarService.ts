import { TagCode } from '../types';
import { HOUR_TO_24 } from '../constants/config';
import { isoDate } from '../utils/dateUtils';

export interface CalendarEventSuggestion {
  text: string;
  tag: TagCode;
  summary: string;
  startHour: number;
  endHour: number;
}

const CACHE_PREFIX = 'gcal_cached_events_';

/**
 * Retrieves cached calendar events for a date from localStorage.
 */
export function getCachedCalendarEventsForDate(dateStr: string): Record<string, { text: string; tag: TagCode }> {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${dateStr}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch {}
  return {};
}

/**
 * Saves calendar events for a date into localStorage cache.
 */
export function saveCachedCalendarEventsForDate(dateStr: string, events: Record<string, { text: string; tag: TagCode }>): void {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${dateStr}`, JSON.stringify(events));
  } catch {}
}

/**
 * Clears all cached calendar events from localStorage.
 */
export function clearAllCachedCalendarEvents(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

/**
 * Fetches Google Calendar events for a given date using the user's OAuth access token.
 * Matches events that fall into specific hour slots and formats them as lightweight non-intrusive suggestions.
 * Caches events locally so suggestions persist all day even if the 60-minute OAuth token expires.
 */
export async function fetchCalendarEventsForDate(
  date: Date,
  accessToken: string | null
): Promise<Record<string, { text: string; tag: TagCode }>> {
  const dStr = isoDate(date);
  const cachedEvents = getCachedCalendarEventsForDate(dStr);

  if (!accessToken) {
    return cachedEvents;
  }

  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const timeMin = startOfDay.toISOString();
    const timeMax = endOfDay.toISOString();

    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.append('timeMin', timeMin);
    url.searchParams.append('timeMax', timeMax);
    url.searchParams.append('singleEvents', 'true');
    url.searchParams.append('orderBy', 'startTime');
    url.searchParams.append('maxResults', '100');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    if (!res.ok) {
      if (res.status === 401) {
        console.warn('Google Calendar token expired; falling back to cached events');
        sessionStorage.removeItem('gcal_access_token');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gcal-token-expired'));
        }
      }
      return cachedEvents;
    }

    const data = await res.json();
    const items = data.items || [];
    const eventMap: Record<string, { text: string; tag: TagCode }> = {};

    for (const item of items) {
      const summary = item.summary || item.description || '';
      if (!summary) continue;

      let startH: number | null = null;
      let endH: number | null = null;

      if (item.start?.dateTime) {
        const d = new Date(item.start.dateTime);
        startH = d.getHours();
      }
      if (item.end?.dateTime) {
        const d = new Date(item.end.dateTime);
        endH = d.getHours();
        // If it ends on exact hour like 11:00, it belongs to 10:00-11:00
        if (d.getMinutes() === 0 && endH > 0) {
          endH = endH - 1;
        }
      }

      if (startH === null) continue;
      if (endH === null || endH < startH) endH = startH;

      // Smart preliminary tag guessing based on title keyword
      let guessedTag: TagCode = 'E';
      const lower = summary.toLowerCase();
      if (lower.includes('sport') || lower.includes('gym') || lower.includes('health') || lower.includes('صحة') || lower.includes('رياضة') || lower.includes('طبيب') || lower.includes('دكتور')) {
        guessedTag = 'SC';
      } else if (lower.includes('read') || lower.includes('plan') || lower.includes('قراءة') || lower.includes('تخطيط') || lower.includes('دراسة') || lower.includes('course') || lower.includes('كورس')) {
        guessedTag = 'V';
      } else if (lower.includes('family') || lower.includes('visit') || lower.includes('عائلة') || lower.includes('زيارة') || lower.includes('مساعدة') || lower.includes('تطوع')) {
        guessedTag = 'S';
      } else if (lower.includes('relax') || lower.includes('rest') || lower.includes('coffee') || lower.includes('قهوة') || lower.includes('راحة') || lower.includes('مشوار') || lower.includes('نزهة')) {
        guessedTag = 'R';
      }

      // Map across matching HOUR_TO_24 keys
      Object.entries(HOUR_TO_24).forEach(([hourKey, h24]) => {
        if (h24 >= startH! && h24 <= endH!) {
          if (!eventMap[hourKey]) {
            eventMap[hourKey] = {
              text: summary.trim(),
              tag: guessedTag
            };
          }
        }
      });
    }

    saveCachedCalendarEventsForDate(dStr, eventMap);
    return eventMap;
  } catch (err) {
    console.warn('Error fetching Google Calendar events, falling back to cache:', err);
    return cachedEvents;
  }
}
