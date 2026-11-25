import type { FirebaseApp } from 'firebase/app';
import type * as AuthSdk from 'firebase/auth';
import type * as FirestoreSdk from 'firebase/firestore';
import { initAppCheck } from './appCheck';

/**
 * Firebase is loaded on demand (dynamic import) so its ~500 KB SDK stays out of
 * the initial bundle. The handles below are null until `loadFirebase()` resolves,
 * and the SDK functions are bound at the same moment as `db` / `auth`.
 *
 * Call sites guard with `if (db && user)` / `if (auth)`, so the UI runs in guest
 * mode first and cloud features light up automatically once Firebase is ready.
 * The function bindings are typed as their real SDK signatures; they are only
 * ever called behind one of those guards, so they are always bound by then.
 */

export let app: FirebaseApp | null = null;
export let auth: AuthSdk.Auth | null = null;
export let db: FirestoreSdk.Firestore | null = null;
export let googleProvider: AuthSdk.GoogleAuthProvider | null = null;

// Live bindings to the SDK, populated by loadFirebase(). Imported elsewhere as
// `import { doc, setDoc } from './services/firebase'` and called after the guards above.
const unbound = null as never;
export let onAuthStateChanged: typeof AuthSdk.onAuthStateChanged = unbound;
export let signInWithPopup: typeof AuthSdk.signInWithPopup = unbound;
export let GoogleAuthProvider: typeof AuthSdk.GoogleAuthProvider = unbound;
export let doc: typeof FirestoreSdk.doc = unbound;
export let setDoc: typeof FirestoreSdk.setDoc = unbound;
export let getDoc: typeof FirestoreSdk.getDoc = unbound;
export let onSnapshot: typeof FirestoreSdk.onSnapshot = unbound;

/**
 * Public web config. These values are not secrets: they identify the project,
 * and access is enforced by firestore.rules (+ App Check and API-key
 * restrictions in the Google Cloud console). See README → "Security".
 */
const firebaseConfig = {
  apiKey: 'AIzaSyCHGBQ-RCIzDRBQqlaEBaH7bQQrredUzYk',
  authDomain: 'time-log-ad714.firebaseapp.com',
  projectId: 'time-log-ad714',
  storageBucket: 'time-log-ad714.firebasestorage.app',
  messagingSenderId: '334822322788',
  appId: '1:334822322788:web:e4522aca1292420404e571'
};

let loadPromise: Promise<void> | null = null;

/** Dynamically loads and initializes Firebase exactly once. */
export function loadFirebase(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const [appMod, authMod, dbMod] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore')
      ]);

      const appInstance =
        appMod.getApps().length > 0 ? appMod.getApps()[0] : appMod.initializeApp(firebaseConfig);
      app = appInstance;

      // App Check must be activated before any Firestore/Auth traffic.
      await initAppCheck(appInstance);

      auth = authMod.getAuth(appInstance);
      db = dbMod.getFirestore(appInstance);

      const provider = new authMod.GoogleAuthProvider();
      // Calendar access is optional: the user only reaches this provider via
      // "Sign in with Google", and the calendar feature itself is a setting.
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      googleProvider = provider;

      onAuthStateChanged = authMod.onAuthStateChanged;
      signInWithPopup = authMod.signInWithPopup;
      GoogleAuthProvider = authMod.GoogleAuthProvider;
      doc = dbMod.doc;
      setDoc = dbMod.setDoc;
      getDoc = dbMod.getDoc;
      onSnapshot = dbMod.onSnapshot;
    } catch (err) {
      console.warn('Firebase initialization skipped or failed:', err);
    }
  })();
  return loadPromise;
}

/** Loads the auth SDK (cached after the first call) once Firebase is ready. */
async function authSdk(): Promise<typeof AuthSdk> {
  await loadFirebase();
  return import('firebase/auth');
}

export const signInWithEmailAndPassword: typeof AuthSdk.signInWithEmailAndPassword = async (...args) =>
  (await authSdk()).signInWithEmailAndPassword(...args);
export const createUserWithEmailAndPassword: typeof AuthSdk.createUserWithEmailAndPassword = async (...args) =>
  (await authSdk()).createUserWithEmailAndPassword(...args);
export const updateProfile: typeof AuthSdk.updateProfile = async (...args) =>
  (await authSdk()).updateProfile(...args);
export const sendPasswordResetEmail: typeof AuthSdk.sendPasswordResetEmail = async (...args) =>
  (await authSdk()).sendPasswordResetEmail(...args);
export const sendEmailVerification: typeof AuthSdk.sendEmailVerification = async (...args) =>
  (await authSdk()).sendEmailVerification(...args);

/**
 * Google sign-in (web popup). Keeps the Calendar access token for this tab only
 * (sessionStorage) so the optional calendar feature can read today's events.
 */
export const signInWithGoogle = async (): Promise<AuthSdk.UserCredential> => {
  await loadFirebase();
  if (!auth || !googleProvider) {
    throw new Error('Firebase Auth is not initialized');
  }

  const res = await signInWithPopup(auth, googleProvider);
  try {
    const token = GoogleAuthProvider.credentialFromResult(res)?.accessToken;
    if (token) {
      // sessionStorage only — never persisted long-term in localStorage.
      sessionStorage.setItem('gcal_access_token', token);
    }
  } catch {
    /* no calendar token — the calendar feature simply stays disconnected */
  }
  return res;
};

/** Signs the current user out of Firebase Auth. */
export const signOut = async (authInstance?: AuthSdk.Auth | null): Promise<void> => {
  await loadFirebase();
  const targetAuth = authInstance || auth;
  if (targetAuth) {
    await (await authSdk()).signOut(targetAuth);
  }
};
