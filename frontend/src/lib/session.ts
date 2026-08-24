const SESSION_KEY = 'aredl_session';

function readStorage(storage: Storage): string | null {
  try {
    return storage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage, token: string): void {
  try {
    storage.setItem(SESSION_KEY, token);
  } catch {
    // Private mode / blocked storage. Cookie-based auth may still apply.
  }
}

function removeStorage(storage: Storage): void {
  try {
    storage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export function getSessionToken(): string | null {
  const persistent = readStorage(localStorage);
  if (persistent) {
    return persistent;
  }

  // Previous builds stored the JWT in sessionStorage, which is cleared when the
  // tab closes. Promote any leftover token so a currently-open session survives.
  const legacy = readStorage(sessionStorage);
  if (legacy) {
    writeStorage(localStorage, legacy);
    removeStorage(sessionStorage);
    return legacy;
  }

  return null;
}

export function setSessionToken(token: string) {
  writeStorage(localStorage, token);
  removeStorage(sessionStorage);
}

export function clearSessionToken() {
  removeStorage(localStorage);
  removeStorage(sessionStorage);
}

/** Read JWT from `?session=…` after OAuth redirect; strip it from the URL. */
export function consumeSessionFromUrl(): boolean {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('session');
  if (!token) {
    return false;
  }

  setSessionToken(token);
  params.delete('session');
  const query = params.toString();
  const nextUrl = query
    ? `${window.location.pathname}?${query}`
    : window.location.pathname;
  history.replaceState(null, '', nextUrl);
  return true;
}

export function authHeaders(): HeadersInit {
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
