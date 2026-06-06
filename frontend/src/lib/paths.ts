/** App root without trailing slash, e.g. `/AREDL_Coordinator` or `` when base is `/`. */
export function appBasePath(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, '');
}

/** Board URL. Keep Vite's trailing slash — dev server requires it for the base route. */
export function boardPath(): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith('/') ? base : `${base}/`;
}

export function adminPath(): string {
  const base = appBasePath();
  return base ? `${base}/admin` : '/admin';
}

export function settingsPath(): string {
  const base = appBasePath();
  return base ? `${base}/settings` : '/settings';
}
