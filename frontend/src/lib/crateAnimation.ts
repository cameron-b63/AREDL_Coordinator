const ANIMATION_KEY = 'aredl:crateAnimation';
const SOUND_KEY = 'aredl:crateSound';

function readFlag(key: string, defaultEnabled: boolean): boolean {
  if (typeof localStorage === 'undefined') {
    return defaultEnabled;
  }
  const stored = localStorage.getItem(key);
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return defaultEnabled;
}

function writeFlag(key: string, enabled: boolean): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(key, enabled ? 'true' : 'false');
}

export function readStoredCrateAnimationEnabled(): boolean {
  return readFlag(ANIMATION_KEY, true);
}

export function readStoredCrateSoundEnabled(): boolean {
  return readFlag(SOUND_KEY, true);
}

export function setStoredCrateAnimationEnabled(enabled: boolean): void {
  writeFlag(ANIMATION_KEY, enabled);
}

export function setStoredCrateSoundEnabled(enabled: boolean): void {
  writeFlag(SOUND_KEY, enabled);
}

/** Dice roll gate: localStorage + reduced-motion only — never server React state. */
export function isCrateAnimationEnabled(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }
  return readStoredCrateAnimationEnabled();
}

export function isCrateSoundEnabled(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }
  return readStoredCrateSoundEnabled();
}
