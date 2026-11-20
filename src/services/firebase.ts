import type { FirebaseApp } from 'firebase/app';
import type { Auth, UserCredential } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';

/**
 * Firebase is loaded on demand (dynamic import) so its ~500 KB SDK stays out of
 * the initial bundle. Every handle below is null until `loadFirebase()` resolves.
 * App.tsx guards usage with `if (db && user)`, so the UI runs in guest mode first
 * and cloud features light up automatically once Firebase is ready.
 */

export let app: FirebaseApp | null = null;
export let auth: any = null;
export let db: Firestore | null = null;
export let googleProvider: any = null;

// SDK functions populated on load (typed as any to keep call sites unchanged).
export let onAuthStateChanged: any = null;
export let signInWithPopup: any = null;
export let signInWithCredential: any = null;
export let GoogleAuthProvider: any = null;
export let doc: any = null;
export let setDoc: any = null;
export let getDoc: any = null;
export let onSnapshot: any = null;

export { Capacitor };

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
      auth = authMod.getAuth(appInstance);
      db = dbMod.getFirestore(appInstance);

      const provider = new authMod.GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      googleProvider = provider;

      onAuthStateChanged = authMod.onAuthStateChanged;
      signInWithPopup = authMod.signInWithPopup;
      signInWithCredential = authMod.signInWithCredential;
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

/** Waits for the lazy SDK, then forwards an auth call to it. */
async function callAuth(name: string, ...args: any[]): Promise<any> {
  await loadFirebase();
  const mod = await import('firebase/auth');
  // Callers pass `auth` as the first argument; replace a stale null with the real instance.
  if (args.length > 0 && (args[0] === null || args[0] === undefined)) {
    args[0] = auth;
  }
  return (mod as any)[name](...args);
}

export const signInWithEmailAndPassword = (...args: any[]) => callAuth('signInWithEmailAndPassword', ...args);
export const createUserWithEmailAndPassword = (...args: any[]) => callAuth('createUserWithEmailAndPassword', ...args);
export const updateProfile = (...args: any[]) => callAuth('updateProfile', ...args);
export const sendPasswordResetEmail = (...args: any[]) => callAuth('sendPasswordResetEmail', ...args);
export const sendEmailVerification = (...args: any[]) => callAuth('sendEmailVerification', ...args);
export const signInWithRedirect = (...args: any[]) => callAuth('signInWithRedirect', ...args);
export const getRedirectResult = (...args: any[]) => callAuth('getRedirectResult', ...args);

/**
 * Unified Google Sign-In helper:
 * - Native (Android/iOS via Capacitor): native Google dialog + Firebase credential.
 * - Web: standard Firebase popup flow.
 */
export const signInWithGoogle = async (): Promise<UserCredential> => {
  await loadFirebase();
  if (!auth) {
    throw new Error('Firebase Auth is not initialized');
  }

  if (Capacitor.isNativePlatform()) {
    const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
    try {
      await GoogleAuth.initialize();
    } catch (initErr) {
      console.warn('GoogleAuth.initialize notice:', initErr);
    }

    const googleUser = await GoogleAuth.signIn();
    const idToken = googleUser?.authentication?.idToken;
    if (!idToken) {
      throw new Error('No ID token received from Google Auth');
    }

    const credential = GoogleAuthProvider.credential(idToken);
    return await signInWithCredential(auth, credential);
  }

  if (!googleProvider) {
    throw new Error('Google Auth Provider is not initialized');
  }

  const res = await signInWithPopup(auth, googleProvider);
  try {
    const cred = GoogleAuthProvider.credentialFromResult(res);
    const token = cred?.accessToken || (res as any)._tokenResponse?.oauthAccessToken;
    if (token) {
      // sessionStorage only — never persisted long-term in localStorage.
      sessionStorage.setItem('gcal_access_token', token);
    }
  } catch {}
  return res;
};

/**
 * Unified Sign-Out helper: Firebase Auth + (natively) GoogleAuth sign-out.
 */
export const signOut = async (authInstance?: Auth | null): Promise<void> => {
  await loadFirebase();
  const targetAuth = authInstance || auth;

  if (Capacitor.isNativePlatform()) {
    try {
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
      await GoogleAuth.signOut();
    } catch (err) {
      console.warn('GoogleAuth.signOut native error:', err);
    }
  }

  if (targetAuth) {
    const mod = await import('firebase/auth');
    await mod.signOut(targetAuth);
  }
};
