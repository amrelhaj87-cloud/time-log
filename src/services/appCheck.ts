import type { FirebaseApp } from 'firebase/app';

/**
 * Firebase App Check (optional).
 *
 * App Check makes Firebase accept requests only from *this* website: each request
 * carries a short-lived token proving it came from the real app (verified with
 * reCAPTCHA v3, invisibly). Someone who copies the public Firebase config into
 * their own script then gets rejected.
 *
 * It is off until `VITE_RECAPTCHA_SITE_KEY` is set (Vercel → Settings →
 * Environment Variables). Setup steps are in README → "Security".
 */
export async function initAppCheck(app: FirebaseApp): Promise<void> {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (!siteKey) return;

  try {
    if (import.meta.env.DEV) {
      // Local dev: Firebase prints a debug token in the console; register it once
      // under App Check → Apps → Manage debug tokens.
      (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    const { initializeAppCheck, ReCaptchaV3Provider } = await import('firebase/app-check');
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true
    });
  } catch (err) {
    console.warn('App Check initialization failed:', err);
  }
}
