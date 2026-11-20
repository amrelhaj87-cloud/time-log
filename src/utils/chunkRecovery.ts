/**
 * chunkRecovery.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Stale-build recovery. When a new deployment replaces the hashed asset files, a
 * tab that is still running the previous bundle asks for chunks that no longer
 * exist (`Failed to fetch dynamically imported module: .../SettingsModal-abc.js`).
 *
 * The fix is to hard-reload onto the new build once: drop the Service Worker
 * cache that could keep serving the old index.html, clear Cache Storage, and
 * reload. A short sessionStorage guard makes a reload loop impossible — if the
 * fresh build still fails, the caller shows a friendly message instead.
 */

const CHUNK_ERROR_PATTERN =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError|Load failed for module/i;

const GUARD_KEY = 'timelog_chunk_reload_at';
const GUARD_WINDOW_MS = 20 * 1000;

/** True when the error means "this chunk URL belongs to an older deployment". */
export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : (error as { message?: string })?.message;
  return typeof message === 'string' && CHUNK_ERROR_PATTERN.test(message);
}

/** The last recovery attempt was too recent, so we must not reload again. */
export function recentlyRecovered(): boolean {
  try {
    const last = Number(sessionStorage.getItem(GUARD_KEY) || '0');
    return last > 0 && Date.now() - last < GUARD_WINDOW_MS;
  } catch {
    return false;
  }
}

async function dropCaches(): Promise<void> {
  try {
    if (navigator.serviceWorker) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    /* ignore */
  }
}

/**
 * Reloads the app onto the latest deployment. Returns `false` when a reload was
 * not performed (guard active, or not running in a browser) so the caller can
 * fall back to a manual message.
 */
export async function recoverFromStaleChunk(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (recentlyRecovered()) return false;

  try {
    sessionStorage.setItem(GUARD_KEY, String(Date.now()));
  } catch {
    /* private mode: still try once */
  }

  await dropCaches();
  window.location.reload();
  return true;
}

/**
 * Explicit user action ("reload now"): always reloads, even inside the guard
 * window, but still drops the stale caches first so the reload can reach the
 * new build.
 */
export async function reloadIgnoringGuard(): Promise<void> {
  if (typeof window === 'undefined') return;
  await dropCaches();
  window.location.reload();
}
