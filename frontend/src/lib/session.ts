export function getSessionToken(): string | null {
  return null;
}

export function setSessionToken(_token: string) {
  // Session storage is intentionally unused.
}

export function clearSessionToken() {
  // Session storage is intentionally unused.
}

/** Read JWT from `?session=…` after OAuth redirect; strip it from the URL. */
export function consumeSessionFromUrl(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('session')) {
    return false;
  }

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
