import { useEffect, useState } from 'react';
import { fetchCalendarEventsForDate } from '../services/calendarService';
import { isoDate } from '../utils/dateUtils';
import type { TagCode } from '../types';

/**
 * Google Calendar token + event-suggestion state, with the token-expiry listener
 * and the per-day fetch effect. Extracted from App.tsx (step 3 of the decomposition).
 * The connect/disconnect handlers stay in App.tsx and use the returned setters.
 */
export function useCalendar(calSyncEnabled: boolean, currentDate: Date) {
  const [gcalAccessToken, setGcalAccessToken] = useState<string | null>(() => {
    return sessionStorage.getItem('gcal_access_token') || null;
  });

  const [googleCalendarEvents, setGoogleCalendarEvents] = useState<
    Record<string, { text: string; tag: TagCode }>
  >({});

  const [dismissedSuggestions, setDismissedSuggestions] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissedSuggestions') || '{}');
    } catch {
      return {};
    }
  });

  // Sync calendar token expiration event
  useEffect(() => {
    const handleExpired = () => {
      setGcalAccessToken(null);
    };
    window.addEventListener('gcal-token-expired', handleExpired);
    return () => window.removeEventListener('gcal-token-expired', handleExpired);
  }, []);

  // Fetch calendar suggestions for the active day (live token or local day cache)
  useEffect(() => {
    if (!calSyncEnabled) {
      setGoogleCalendarEvents({});
      return;
    }

    const dateStr = isoDate(currentDate);
    let isMounted = true;
    fetchCalendarEventsForDate(currentDate, gcalAccessToken).then((events) => {
      if (!isMounted) return;
      const activeEvents: Record<string, { text: string; tag: TagCode }> = {};
      Object.entries(events).forEach(([k, val]) => {
        if (!dismissedSuggestions[`${dateStr}_${k}`]) {
          activeEvents[k] = val;
        }
      });
      setGoogleCalendarEvents(activeEvents);
    });

    return () => {
      isMounted = false;
    };
  }, [calSyncEnabled, gcalAccessToken, currentDate, dismissedSuggestions]);

  return {
    gcalAccessToken,
    setGcalAccessToken,
    googleCalendarEvents,
    setGoogleCalendarEvents,
    dismissedSuggestions,
    setDismissedSuggestions
  };
}
