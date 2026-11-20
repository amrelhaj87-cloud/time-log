import { beforeEach, describe, expect, it } from 'vitest';
import { isChunkLoadError, recentlyRecovered } from './chunkRecovery';

class MemorySession {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

describe('isChunkLoadError', () => {
  it('detects the browser messages for a stale lazy chunk', () => {
    expect(
      isChunkLoadError(
        new TypeError('Failed to fetch dynamically imported module: https://example.com/assets/SettingsModal-abc.js')
      )
    ).toBe(true);
    expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('Load failed for module /assets/x.js'))).toBe(true);
    expect(isChunkLoadError('Failed to fetch dynamically imported module: /a.js')).toBe(true);
  });

  it('ignores ordinary runtime errors', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(new Error('Failed to sync week to Firestore'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
    expect(isChunkLoadError({})).toBe(false);
  });
});

describe('recentlyRecovered', () => {
  beforeEach(() => {
    (globalThis as any).sessionStorage = new MemorySession();
  });

  it('is false before any recovery attempt', () => {
    expect(recentlyRecovered()).toBe(false);
  });

  it('is true right after a recovery and false once the window passes', () => {
    sessionStorage.setItem('timelog_chunk_reload_at', String(Date.now()));
    expect(recentlyRecovered()).toBe(true);

    sessionStorage.setItem('timelog_chunk_reload_at', String(Date.now() - 60_000));
    expect(recentlyRecovered()).toBe(false);
  });

  it('does not throw when sessionStorage is unavailable', () => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      get() {
        throw new Error('blocked');
      },
      configurable: true
    });
    expect(recentlyRecovered()).toBe(false);
  });
});
