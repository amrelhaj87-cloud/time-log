/**
 * Firestore security-rules tests. They run against the local Firestore
 * emulator (needs Java 11+), so they are kept out of `npm test`:
 *
 *   npm run test:rules
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, getDocs, collection, setDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

const NOW = '2026-11-25T08:00:00.000Z';
const weekPath = (uid: string, id = '2026-11-23') => `artifacts/time-log-app/users/${uid}/weeks/${id}`;
const inboxPath = (uid: string) => `artifacts/time-log-app/users/${uid}/inbox/todos`;
const prefsPath = (uid: string) => `users/${uid}/settings/preferences`;

/** A signed-in user; email/password accounts are unverified until activated. */
const verified = (uid = 'alice') => env.authenticatedContext(uid, { email_verified: true }).firestore();
const unverified = (uid = 'alice') => env.authenticatedContext(uid, { email_verified: false }).firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-timelog',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') }
  });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => env.clearFirestore());

describe('weeks', () => {
  it('lets a verified owner write and read their week (create + merge update)', async () => {
    const db = verified();
    await assertSucceeds(setDoc(doc(db, weekPath('alice')), { json: '{"days":{}}', updatedAt: NOW }));
    await assertSucceeds(setDoc(doc(db, weekPath('alice')), { json: '{"days":{"x":1}}', updatedAt: NOW }, { merge: true }));
    await assertSucceeds(getDoc(doc(db, weekPath('alice'))));
  });

  it('blocks unverified email accounts from writing (bot sign-ups store nothing)', async () => {
    await assertFails(setDoc(doc(unverified(), weekPath('alice')), { json: '{}', updatedAt: NOW }));
  });

  it("blocks reading or writing someone else's week", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), weekPath('bob')), { json: '{}', updatedAt: NOW });
    });
    const db = verified('alice');
    await assertFails(getDoc(doc(db, weekPath('bob'))));
    await assertFails(setDoc(doc(db, weekPath('bob')), { json: '{}', updatedAt: NOW }));
    await assertFails(deleteDoc(doc(db, weekPath('bob'))));
  });

  it('blocks signed-out access', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, weekPath('alice'))));
    await assertFails(setDoc(doc(db, weekPath('alice')), { json: '{}', updatedAt: NOW }));
  });

  it('rejects bad ids, extra fields, wrong types and oversized weeks', async () => {
    const db = verified();
    await assertFails(setDoc(doc(db, weekPath('alice', 'not-a-date')), { json: '{}', updatedAt: NOW }));
    await assertFails(setDoc(doc(db, weekPath('alice')), { json: '{}', updatedAt: NOW, junk: 'x' }));
    await assertFails(setDoc(doc(db, weekPath('alice')), { json: 42, updatedAt: NOW }));
    await assertFails(setDoc(doc(db, weekPath('alice')), { json: 'x'.repeat(400001), updatedAt: NOW }));
  });

  it('still accepts merge writes to an old document that has a legacy field', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), weekPath('alice')), { json: '{}', updatedAt: NOW, legacy: true });
    });
    await assertSucceeds(setDoc(doc(verified(), weekPath('alice')), { json: '{"a":1}', updatedAt: NOW }, { merge: true }));
  });
});

describe('inbox', () => {
  it('accepts the todos list and rejects other docs / shapes', async () => {
    const db = verified();
    await assertSucceeds(setDoc(doc(db, inboxPath('alice')), { items: [{ id: '1', text: 'x' }], updatedAt: NOW }));
    await assertFails(setDoc(doc(db, `artifacts/time-log-app/users/alice/inbox/other`), { items: [], updatedAt: NOW }));
    await assertFails(setDoc(doc(db, inboxPath('alice')), { items: 'nope', updatedAt: NOW }));
    await assertFails(setDoc(doc(db, inboxPath('alice')), { items: new Array(2001).fill(0), updatedAt: NOW }));
  });
});

describe('preferences', () => {
  it('accepts the app’s preference writes (full sync and single-field merges)', async () => {
    const db = verified();
    await assertSucceeds(
      setDoc(
        doc(db, prefsPath('alice')),
        {
          sleepWindow: { start: '23:00', end: '05:00' },
          birthDate: '',
          ageDisplayOpt: 'none',
          weekStartDay: 'saturday',
          tagTargets: { E: 6, V: 2, R: 3, S: 2, SC: 2 },
          themeMode: 'dark',
          isDetailedView: false,
          updatedAt: NOW
        },
        { merge: true }
      )
    );
    await assertSucceeds(setDoc(doc(db, prefsPath('alice')), { themePalette: 'ocean', updatedAt: NOW }, { merge: true }));
  });

  it('rejects other settings docs and unverified writers', async () => {
    await assertFails(setDoc(doc(verified(), 'users/alice/settings/other'), { a: 1 }));
    await assertFails(setDoc(doc(unverified(), prefsPath('alice')), { themeMode: 'dark', updatedAt: NOW }));
  });
});

describe('other paths', () => {
  it('denies anything the app does not use', async () => {
    const db = verified();
    await assertFails(setDoc(doc(db, 'users/alice/secrets/x'), { a: 1 }));
    await assertFails(setDoc(doc(db, 'artifacts/time-log-app/users/alice/other/x'), { a: 1 }));
    await assertFails(setDoc(doc(db, 'weeks/2026-11-23'), { json: '{}' }));
    await assertFails(getDoc(doc(db, 'weeks/2026-11-23')));
  });
});

describe('account deletion', () => {
  it('lets an owner list and delete all their data, even if unverified', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const admin = ctx.firestore();
      await setDoc(doc(admin, weekPath('alice')), { json: '{}', updatedAt: NOW });
      await setDoc(doc(admin, inboxPath('alice')), { items: [], updatedAt: NOW });
      await setDoc(doc(admin, prefsPath('alice')), { themeMode: 'dark' });
    });
    const db = unverified();
    for (const col of [
      'artifacts/time-log-app/users/alice/weeks',
      'artifacts/time-log-app/users/alice/inbox',
      'users/alice/settings'
    ]) {
      const snap = await assertSucceeds(getDocs(collection(db, col)));
      for (const d of snap.docs) await assertSucceeds(deleteDoc(d.ref));
    }
  });
});
