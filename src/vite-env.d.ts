/// <reference types="vite/client" />

/** Commit SHA injected at build time (see vite.config.ts `define`). */
declare const __BUILD_COMMIT__: string;

interface ImportMetaEnv {
  /** reCAPTCHA Enterprise site key override for Firebase App Check, or "off" (see services/appCheck.ts). */
  readonly VITE_RECAPTCHA_SITE_KEY?: string;
}
