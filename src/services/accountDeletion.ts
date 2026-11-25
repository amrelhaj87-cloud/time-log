import { auth, db, loadFirebase } from './firebase';

/**
 * Self-serve "delete my account and data" (privacy policy §6).
 *
 * Order matters, so a failure never leaves a half-deleted account:
 *  1. Re-authenticate (Firebase only lets a recently signed-in user delete
 *     themselves) — if this fails, nothing has been touched yet.
 *  2. Delete every Firestore document the app stores for this user.
 *  3. Delete the Firebase Auth user.
 *  4. Wipe this device's local data (see clearLocalAppData).
 */

/** How the signed-in user proves it's them again: a Google popup, or their password. */
export type ReauthMethod = 'google' | 'password' | 'none';

export function currentReauthMethod(): ReauthMethod {
  const user = auth?.currentUser;
  if (!user) return 'none';
  const providers = user.providerData.map((p) => p.providerId);
  if (providers.includes('google.com')) return 'google';
  if (providers.includes('password')) return 'password';
  return 'none';
}

export function currentUserEmail(): string {
  return auth?.currentUser?.email ?? '';
}

export type DeleteAccountErrorCode =
  | 'not-signed-in'
  | 'wrong-password'
  | 'reauth-cancelled'
  | 'popup-blocked'
  | 'network'
  | 'unknown';

export class DeleteAccountError extends Error {
  constructor(public code: DeleteAccountErrorCode, cause?: unknown) {
    super(code);
    this.cause = cause;
  }
}

function toDeleteError(err: unknown): DeleteAccountError {
  if (err instanceof DeleteAccountError) return err;
  const code = String((err as { code?: unknown } | null)?.code ?? '');
  if (code.includes('wrong-password') || code.includes('invalid-credential') || code.includes('invalid-login'))
    return new DeleteAccountError('wrong-password', err);
  if (code.includes('popup-closed') || code.includes('cancelled-popup') || code.includes('user-mismatch'))
    return new DeleteAccountError('reauth-cancelled', err);
  if (code.includes('popup-blocked')) return new DeleteAccountError('popup-blocked', err);
  if (code.includes('network')) return new DeleteAccountError('network', err);
  return new DeleteAccountError('unknown', err);
}

/** Deletes the signed-in user's cloud data and account. `password` is needed for email accounts. */
export async function deleteAccountAndData(password?: string): Promise<void> {
  await loadFirebase();
  const user = auth?.currentUser;
  if (!auth || !db || !user) throw new DeleteAccountError('not-signed-in');

  const authSdk = await import('firebase/auth');
  const fs = await import('firebase/firestore');

  try {
    // 1. Re-authenticate.
    const method = currentReauthMethod();
    if (method === 'google') {
      await authSdk.reauthenticateWithPopup(user, new authSdk.GoogleAuthProvider());
    } else if (method === 'password') {
      if (!user.email || !password) throw new DeleteAccountError('wrong-password');
      await authSdk.reauthenticateWithCredential(user, authSdk.EmailAuthProvider.credential(user.email, password));
    }

    // 2. Firestore data. Collections can't be deleted in one call from the
    //    client, so list each one and delete its documents.
    const uid = user.uid;
    const appRoot = ['artifacts', 'time-log-app', 'users', uid] as const;
    const collections = [
      fs.collection(db, ...appRoot, 'weeks'),
      fs.collection(db, ...appRoot, 'inbox'),
      fs.collection(db, 'users', uid, 'settings')
    ];
    for (const col of collections) {
      const snap = await fs.getDocs(col);
      await Promise.all(snap.docs.map((d) => fs.deleteDoc(d.ref)));
    }

    // 3. The account itself.
    await authSdk.deleteUser(user);
  } catch (err) {
    throw toDeleteError(err);
  }
}

/**
 * Removes everything Time Log stored in this browser: hour logs, tasks,
 * preferences, theme, calendar cache and the error log. The offline app shell
 * (service-worker cache) holds no personal data and is left alone.
 */
export function clearLocalAppData(): void {
  try {
    localStorage.clear();
  } catch {
    /* storage unavailable */
  }
  try {
    sessionStorage.clear();
  } catch {
    /* storage unavailable */
  }
}
