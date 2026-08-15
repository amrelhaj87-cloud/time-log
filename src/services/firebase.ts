import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithCredential,
  signInWithRedirect,
  getRedirectResult,
  Auth
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  Firestore
} from 'firebase/firestore';

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

export {
  app,
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithCredential,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  doc,
  setDoc,
  getDoc
};
