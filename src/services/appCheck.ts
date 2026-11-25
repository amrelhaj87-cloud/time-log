import type { FirebaseApp } from 'firebase/app';

/**
 * Firebase App Check (optional).
 *
 * App Check makes Firebase accept requests only from *this* website: each request
 * carries a short-lived token proving it came from the real app (verified with
 * reCAPTCHA Enterprise / Fraud Defense, invisibly). Someone who copies the public Firebase config into
 * their own script then gets rejected.
 *
 * The reCAPTCHA Enterprise *site* key is public by design (it ships in every
 * page; there is no secret key). It lives in Google Cloud → Security → Fraud
 * Defense → Keys (project time-log-ad714) and is registered in Firebase Console
 * → App Check. `VITE_RECAPTCHA_SITE_KEY` overrides it, and "off" disables App
 * Check (e.g. for a fork on another Firebase project). Free up to 10,000
 * token exchanges a month; with a 1-day token TTL that is ~300 daily users.
 *
 * Local `npm run dev` uses a debug token instead (see below).
 */
const DEFAULT_SITE_KEY = '6LeYCDIuAAAAAM2hzD9888ljE7zK6sVVIe01uHb_';

export async function initAppCheck(app: FirebaseApp): Promise<void> {
  const configured = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (configured === 'off') return;
  const siteKey = configured || DEFAULT_SITE_KEY;

  try {
    if (import.meta.env.DEV) {
      // Local dev: Firebase prints a debug token in the console; register it once
      // under App Check → Apps → Manage debug tokens.
      (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import('firebase/app-check');
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true
    });
  } catch (err) {
    console.warn('App Check initialization failed:', err);
  }
}
