import { beforeEach, describe, expect, it, vi } from 'vitest';

// Records every SDK call so the test can check what ran, and in what order.
const calls: string[] = [];
const user = {
  uid: 'u1',
  email: 'me@example.com',
  providerData: [{ providerId: 'password' }]
};

vi.mock('./firebase', () => ({
  auth: { currentUser: user },
  db: {},
  loadFirebase: async () => {}
}));

let reauthFails = false;
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {},
  EmailAuthProvider: { credential: (email: string, pw: string) => ({ email, pw }) },
  reauthenticateWithPopup: async () => {
    calls.push('reauth');
  },
  reauthenticateWithCredential: async () => {
    calls.push('reauth');
    if (reauthFails) throw Object.assign(new Error('bad'), { code: 'auth/wrong-password' });
  },
  deleteUser: async () => {
    calls.push('deleteUser');
  }
}));

vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...path: string[]) => path.join('/'),
  getDocs: async (col: string) => ({ docs: [{ ref: `${col}/a` }, { ref: `${col}/b` }] }),
  deleteDoc: async (ref: string) => {
    calls.push(`delete:${ref}`);
  }
}));

const { deleteAccountAndData, DeleteAccountError } = await import('./accountDeletion');

beforeEach(() => {
  calls.length = 0;
  reauthFails = false;
});

describe('deleteAccountAndData', () => {
  it('re-authenticates, deletes every collection, then deletes the user', async () => {
    await deleteAccountAndData('pw');
    expect(calls[0]).toBe('reauth');
    expect(calls.at(-1)).toBe('deleteUser');
    expect(calls).toContain('delete:artifacts/time-log-app/users/u1/weeks/a');
    expect(calls).toContain('delete:artifacts/time-log-app/users/u1/inbox/a');
    expect(calls).toContain('delete:users/u1/settings/a');
    expect(calls.filter((c) => c.startsWith('delete:'))).toHaveLength(6);
  });

  it('deletes nothing when the password is wrong', async () => {
    reauthFails = true;
    await expect(deleteAccountAndData('nope')).rejects.toMatchObject({ code: 'wrong-password' });
    expect(calls).toEqual(['reauth']);
  });

  it('refuses an email account without a password', async () => {
    await expect(deleteAccountAndData()).rejects.toBeInstanceOf(DeleteAccountError);
    expect(calls).toEqual([]);
  });
});
