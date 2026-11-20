/**
 * Lightweight, dependency-free error monitoring.
 *
 * Captures uncaught errors and unhandled promise rejections, logs them with
 * context, and keeps the last N errors in localStorage so they can be inspected
 * later (e.g. to report a bug). No external SDK or DSN is required.
 *
 * Upgrade path: add @sentry/browser and call Sentry.init() inside
 * initErrorMonitoring() when a DSN is available (see RECOMMENDATIONS.md).
 */

interface StoredError {
  at: string;
  message: string;
  source: 'uncaught' | 'unhandledrejection' | 'react';
  stack?: string;
  context?: Record<string, unknown>;
}

const STORAGE_KEY = 'timelog_recent_errors';
const MAX_STORED = 20;
const buffer: StoredError[] = [];
let installed = false;

function persist(entry: StoredError): void {
  buffer.push(entry);
  if (buffer.length > MAX_STORED) buffer.shift();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer));
  } catch {
    /* storage full or unavailable — never break the app */
  }
}

function describe(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) return { message: error.message, stack: error.stack };
  return { message: String(error) };
}

/** Attach global error listeners once, as early as possible in the app lifecycle. */
export function initErrorMonitoring(): void {
  if (typeof window === 'undefined' || installed) return;
  installed = true;

  window.addEventListener('error', (event) => {
    const { message, stack } = describe(event.error ?? event.message);
    persist({ at: new Date().toISOString(), message, stack, source: 'uncaught' });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const { message, stack } = describe(event.reason);
    persist({ at: new Date().toISOString(), message, stack, source: 'unhandledrejection' });
  });
}

/** Report an application error (used by the React ErrorBoundary). */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  const { message, stack } = describe(error);
  console.error('[time-log][error]', error, context ?? '');
  persist({ at: new Date().toISOString(), message, stack, source: 'react', context });
}
