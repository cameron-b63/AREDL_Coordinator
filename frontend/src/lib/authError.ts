/** Read auth error from `?auth=error&message=…` after OAuth redirect; strip from URL. */
export function consumeAuthErrorFromUrl(): string | null {
  const url = new URL(window.location.href);
  if (url.searchParams.get('auth') !== 'error') {
    return null;
  }

  const message = url.searchParams.get('message') ?? 'Sign in failed';
  url.searchParams.delete('auth');
  url.searchParams.delete('message');
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, '', next);
  return message;
}
