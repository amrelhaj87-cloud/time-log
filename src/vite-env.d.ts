/// <reference types="vite/client" />

/** Commit SHA injected at build time (see vite.config.ts `define`). */
declare const __BUILD_COMMIT__: string;

interface ImportMetaEnv {
  /** Optional reCAPTCHA v3 site key that turns on Firebase App Check (see services/appCheck.ts). */
  readonly VITE_RECAPTCHA_SITE_KEY?: string;
}
