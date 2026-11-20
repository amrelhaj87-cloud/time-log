import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithCredential,
  signInWithRedirect,
  getRedirectResult,
  Auth,
  UserCredential
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  Firestore
} from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

const firebaseConfig = {
  apiKey: "AIzaSyCHGBQ-RCIzDRBQqlaEBaH7bQQrredUzYk",
  authDomain: "time-log-ad714.firebaseapp.com",
  projectId: "time-log-ad714",
  storageBucket: "time-log-ad714.firebasestorage.app",
  messagingSenderId: "334822322788",
  appId: "1:334822322788:web:e4522aca1292420404e571"
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');
} catch (err) {
  console.warn('Firebase initialization skipped or failed:', err);
}

/**
 * Unified Google Sign-In helper:
 * - Native Platform (Android / iOS via Capacitor): Uses `@codetrix-studio/capacitor-google-auth` to prompt
 *   the native Google Sign-In dialog, retrieves the idToken, and signs in to Firebase with `signInWithCredential`.
 * - Web Browser: Uses standard Firebase `signInWithPopup` flow with `googleProvider`.
 */
export const signInWithGoogle = async (): Promise<UserCredential> => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized');
  }

  if (Capacitor.isNativePlatform()) {
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
      // Store the Google Calendar access token only in sessionStorage (cleared on tab close)
      // to avoid persisting it long-term in localStorage where it is more exposed to XSS.
      sessionStorage.setItem('gcal_access_token', token);
    }
  } catch {}
  return res;
};

/**
 * Unified Sign-Out helper:
 * Signs out of Firebase Auth, and if running natively on Capacitor, also signs out of GoogleAuth
 * to ensure fresh account selection on subsequent sign-ins.
 */
export const signOut = async (authInstance?: Auth | null): Promise<void> => {
  const targetAuth = authInstance || auth;
  if (Capacitor.isNativePlatform()) {
    try {
      await GoogleAuth.signOut();
    } catch (err) {
      console.warn('GoogleAuth.signOut native error:', err);
    }
  }
  if (targetAuth) {
    await firebaseSignOut(targetAuth);
  }
};

export {
  app,
  auth,
  db,
  googleProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithCredential,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  GoogleAuth,
  Capacitor,
  doc,
  setDoc,
  getDoc,
  onSnapshot
};

