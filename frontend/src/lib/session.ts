const SESSION_KEY = 'aredl_session';

export function getSessionToken(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

export function setSessionToken(token: string) {
  sessionStorage.setItem(SESSION_KEY, token);
}

export function clearSessionToken() {
  sessionStorage.removeItem(SESSION_KEY);
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
