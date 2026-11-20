/**
 * Auto-update: detects when the deployed build differs from the running one and
 * reloads to the new version. Before reloading it unregisters stale Service
 * Workers so a cached PWA copy cannot keep serving the old build.
 *
 * A sessionStorage guard limits reloads so this can never enter a loop.
 */

const RELOAD_GUARD_KEY = 'timelog_update_reload_at';
const RELOAD_GUARD_MS = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

async function checkForUpdate(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const res = await fetch('/version.json', { cache: 'no-store' });
    if (!res.ok) return;

    const info = (await res.json()) as { commit?: string };
    const deployed = info?.commit;
    const running = typeof __BUILD_COMMIT__ !== 'undefined' ? __BUILD_COMMIT__ : '';

    if (!deployed || !running || running === 'unknown' || deployed === running) return;

    // Guard against reload storms (e.g. CDN still serving a stale version.json).
    const lastReloadAt = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || '0');
    if (Date.now() - lastReloadAt < RELOAD_GUARD_MS) return;
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));

    // Drop stale Service Worker registrations so the reload really hits the new build.
    try {
      if (navigator.serviceWorker) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
    } catch {
      /* ignore */
    }

    window.location.reload();
  } catch {
    /* offline or version.json unavailable — ignore */
  }
}

/** Start the background update checker (on load, periodically, and on tab focus). */
export function initAutoUpdate(): void {
  if (typeof window === 'undefined') return;

  void checkForUpdate();
  window.setInterval(() => void checkForUpdate(), CHECK_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForUpdate();
  });
}
