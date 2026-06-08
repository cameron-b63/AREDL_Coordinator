const ANIMATION_KEY = 'aredl:crateAnimation.v1';
const SOUND_KEY = 'aredl:crateSound.v1';
const LEGACY_ANIMATION_KEY = 'aredl:crateAnimation';
const LEGACY_SOUND_KEY = 'aredl:crateSound';

function readFlag(key: string, defaultEnabled: boolean): boolean {
  if (typeof localStorage === 'undefined') {
    return defaultEnabled;
  }
  try {
    const stored = localStorage.getItem(key);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
    return defaultEnabled;
  } catch {
    return defaultEnabled;
  }
}

function writeFlag(key: string, enabled: boolean): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(key, enabled ? 'true' : 'false');
  } catch {
    // Private mode / blocked storage — in-memory state still applies for this session.
  }
}

function migrateLegacyFlag(v1Key: string, legacyKey: string): boolean {
  const v1 = readFlag(v1Key, true);
  if (typeof localStorage === 'undefined') {
    return v1;
  }
  try {
    if (localStorage.getItem(v1Key) !== null) {
      return v1;
    }
    // v1 unset: default enabled to recover broken browser profiles; honor explicit legacy off.
    const legacy = localStorage.getItem(legacyKey);
    if (legacy === 'false') {
      writeFlag(v1Key, false);
      return false;
    }
    if (legacy === 'true') {
      writeFlag(v1Key, true);
      return true;
    }
    writeFlag(v1Key, true);
    return true;
  } catch {
    return true;
  }
}

export function readStoredCrateAnimationEnabled(): boolean {
  return migrateLegacyFlag(ANIMATION_KEY, LEGACY_ANIMATION_KEY);
}

export function readStoredCrateSoundEnabled(): boolean {
  return migrateLegacyFlag(SOUND_KEY, LEGACY_SOUND_KEY);
}

export function setStoredCrateAnimationEnabled(enabled: boolean): void {
  writeFlag(ANIMATION_KEY, enabled);
}

export function setStoredCrateSoundEnabled(enabled: boolean): void {
  writeFlag(SOUND_KEY, enabled);
}

/** Dice roll gate: in-app Settings (localStorage) only — not OS prefers-reduced-motion. */
export function isCrateAnimationEnabled(): boolean {
  return readStoredCrateAnimationEnabled();
}

export function isCrateSoundEnabled(): boolean {
  return readStoredCrateSoundEnabled();
}

export function logCrateGateDebug(): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (!new URLSearchParams(window.location.search).has('crateDebug')) {
    return;
  }
  let animationStored: string | null = null;
  let soundStored: string | null = null;
  try {
    animationStored = localStorage.getItem(ANIMATION_KEY);
    soundStored = localStorage.getItem(SOUND_KEY);
  } catch {
    // ignore
  }
  console.log('[crate:debug]', {
    reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    animationEnabled: isCrateAnimationEnabled(),
    soundEnabled: isCrateSoundEnabled(),
    animationStored,
    soundStored,
    legacyAnimation: (() => {
      try {
        return localStorage.getItem(LEGACY_ANIMATION_KEY);
      } catch {
        return null;
      }
    })(),
  });
}
