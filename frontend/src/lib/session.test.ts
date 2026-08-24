import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

class MemoryStorage {
  #map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.#map.has(key) ? this.#map.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.#map.set(key, String(value));
  }

  removeItem(key: string): void {
    this.#map.delete(key);
  }

  clear(): void {
    this.#map.clear();
  }
}

const local = new MemoryStorage();
const session = new MemoryStorage();

Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: local });
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: session });
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { location: { search: '', pathname: '/' } },
});
Object.defineProperty(globalThis, 'history', {
  configurable: true,
  value: { replaceState() {} },
});

const {
  authHeaders,
  clearSessionToken,
  consumeSessionFromUrl,
  getSessionToken,
  setSessionToken,
} = await import('./session.ts');

afterEach(() => {
  local.clear();
  session.clear();
  window.location.search = '';
  window.location.pathname = '/';
});

test('keeps the JWT in localStorage after a new browser session', () => {
  setSessionToken('jwt-from-oauth');
  assert.equal(local.getItem('aredl_session'), 'jwt-from-oauth');
  assert.equal(session.getItem('aredl_session'), null);

  // New browser session: tab-scoped storage is empty, persistent storage is not.
  session.clear();
  assert.equal(getSessionToken(), 'jwt-from-oauth');
  assert.deepEqual(authHeaders(), { Authorization: 'Bearer jwt-from-oauth' });
});

test('migrates a leftover sessionStorage token into localStorage', () => {
  session.setItem('aredl_session', 'legacy-tab-token');
  assert.equal(getSessionToken(), 'legacy-tab-token');
  assert.equal(local.getItem('aredl_session'), 'legacy-tab-token');
  assert.equal(session.getItem('aredl_session'), null);

  session.clear();
  assert.equal(getSessionToken(), 'legacy-tab-token');
});

test('clears both persistent and tab-scoped tokens on sign-out', () => {
  setSessionToken('to-be-cleared');
  session.setItem('aredl_session', 'stale-tab-token');
  clearSessionToken();
  assert.equal(getSessionToken(), null);
  assert.equal(local.getItem('aredl_session'), null);
  assert.equal(session.getItem('aredl_session'), null);
  assert.deepEqual(authHeaders(), {});
});

test('stores the OAuth redirect JWT in localStorage', () => {
  window.location.search = '?session=url-jwt&foo=bar';
  window.location.pathname = '/board';
  assert.equal(consumeSessionFromUrl(), true);
  assert.equal(getSessionToken(), 'url-jwt');
  assert.equal(local.getItem('aredl_session'), 'url-jwt');
  assert.equal(session.getItem('aredl_session'), null);
});
