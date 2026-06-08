import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { putPreferences } from '../lib/api';
import {
  defaultUserPreferences,
  levelFiltersFromStored,
  storedFromLevelFilters,
  type UserPreferences,
} from '../lib/types/preferences';
import {
  DEFAULT_LEVEL_FILTERS,
  type LevelFilters,
} from '../lib/types/filters';
import {
  DEFAULT_SORT_DIRECTION,
  DEFAULT_SORT_MODE,
  type SortDirection,
  type SortMode,
} from '../lib/types/sort';
import type { User } from '../lib/types/user';

const SAVE_DEBOUNCE_MS = 400;

function buildSavePayload(
  filters: LevelFilters,
  sortDirection: SortDirection,
  sortMode: SortMode,
  randomLevelCrateAnimation: boolean,
  randomLevelCrateSound: boolean,
): UserPreferences {
  return {
    filters: storedFromLevelFilters(filters),
    sortDirection,
    sortMode,
    randomLevelCrateAnimation,
    randomLevelCrateSound,
  };
}

function serializeSavePayload(payload: UserPreferences): string {
  return JSON.stringify(payload);
}

function prefsKeyForUser(user: User | null): string {
  if (!user) {
    return 'guest';
  }
  return JSON.stringify(user.preferences ?? defaultUserPreferences());
}

function applyStoredPreferences(
  prefs: UserPreferences,
  setFilters: (value: LevelFilters) => void,
  setSortDirection: (value: SortDirection) => void,
  setSortMode: (value: SortMode) => void,
  setRandomLevelCrateAnimation: (value: boolean) => void,
  setRandomLevelCrateSound: (value: boolean) => void,
): UserPreferences {
  setFilters(levelFiltersFromStored(prefs.filters));
  setSortDirection(prefs.sortDirection);
  setSortMode(prefs.sortMode);
  setRandomLevelCrateAnimation(prefs.randomLevelCrateAnimation !== false);
  setRandomLevelCrateSound(prefs.randomLevelCrateSound !== false);
  return {
    ...prefs,
    randomLevelCrateAnimation: prefs.randomLevelCrateAnimation !== false,
    randomLevelCrateSound: prefs.randomLevelCrateSound !== false,
  };
}

export function useUserPreferences(
  user: User | null | undefined,
  setUser?: (user: User) => void,
) {
  const [filters, setFilters] = useState<LevelFilters>(DEFAULT_LEVEL_FILTERS);
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(DEFAULT_SORT_DIRECTION);
  const [sortMode, setSortMode] = useState<SortMode>(DEFAULT_SORT_MODE);
  const [randomLevelCrateAnimation, setRandomLevelCrateAnimationState] = useState(true);
  const [randomLevelCrateSound, setRandomLevelCrateSoundState] = useState(true);

  const skipSaveRef = useRef(true);
  const savingRef = useRef(false);
  const lastSavedPayloadRef = useRef<string | null>(null);
  const lastSyncedUserIdRef = useRef<string | null | undefined>(undefined);
  const lastSyncedPrefsKeyRef = useRef<string>('');

  const markSynced = useCallback((syncedUser: User | null, payload: UserPreferences) => {
    lastSavedPayloadRef.current = serializeSavePayload(payload);
    lastSyncedUserIdRef.current = syncedUser?.id ?? null;
    lastSyncedPrefsKeyRef.current = prefsKeyForUser(syncedUser);
  }, []);

  useEffect(() => {
    if (user === undefined || savingRef.current) {
      return;
    }

    const userId = user?.id ?? null;
    const prefsKey = prefsKeyForUser(user);

    if (lastSyncedUserIdRef.current === userId && lastSyncedPrefsKeyRef.current === prefsKey) {
      return;
    }

    skipSaveRef.current = true;

    if (!user) {
      setFilters(DEFAULT_LEVEL_FILTERS);
      setSortDirection(DEFAULT_SORT_DIRECTION);
      setSortMode(DEFAULT_SORT_MODE);
      setRandomLevelCrateAnimationState(true);
      setRandomLevelCrateSoundState(true);
      markSynced(null, defaultUserPreferences());
    } else {
      const prefs = user.preferences ?? defaultUserPreferences();
      const normalized = applyStoredPreferences(
        prefs,
        setFilters,
        setSortDirection,
        setSortMode,
        setRandomLevelCrateAnimationState,
        setRandomLevelCrateSoundState,
      );
      markSynced(user, normalized);
    }

    const timer = window.setTimeout(() => {
      skipSaveRef.current = false;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [markSynced, user]);

  const savePreferencesNow = useCallback(
    async (overrides?: {
      randomLevelCrateAnimation?: boolean;
      randomLevelCrateSound?: boolean;
    }) => {
      if (!user) {
        return;
      }

      const payload = buildSavePayload(
        filters,
        sortDirection,
        sortMode,
        overrides?.randomLevelCrateAnimation ?? randomLevelCrateAnimation,
        overrides?.randomLevelCrateSound ?? randomLevelCrateSound,
      );

      const serialized = serializeSavePayload(payload);
      if (serialized === lastSavedPayloadRef.current) {
        return;
      }

      skipSaveRef.current = true;
      savingRef.current = true;
      try {
        const updated = await putPreferences(payload);
        markSynced(updated, updated.preferences);
        setUser?.(updated);
      } catch (error) {
        console.error('Failed to save preferences', error);
      } finally {
        savingRef.current = false;
        window.setTimeout(() => {
          skipSaveRef.current = false;
        }, 0);
      }
    },
    [
      filters,
      markSynced,
      randomLevelCrateAnimation,
      randomLevelCrateSound,
      setUser,
      sortDirection,
      sortMode,
      user,
    ],
  );

  useEffect(() => {
    if (skipSaveRef.current || !user) {
      return;
    }

    const payload = buildSavePayload(
      filters,
      sortDirection,
      sortMode,
      randomLevelCrateAnimation,
      randomLevelCrateSound,
    );
    if (serializeSavePayload(payload) === lastSavedPayloadRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      void savePreferencesNow();
    }, SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [filters, savePreferencesNow, sortDirection, sortMode, user]);

  const setFilter = useCallback(<K extends keyof LevelFilters>(key: K, value: LevelFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const toggleSortDirection = useCallback(() => {
    setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
  }, []);

  const toggleSortMode = useCallback(() => {
    setSortMode((current) => (current === 'position' ? 'record_date' : 'position'));
  }, []);

  const setRandomLevelCrateAnimation = useCallback(
    (checked: boolean) => {
      setRandomLevelCrateAnimationState(checked);
      if (user) {
        void savePreferencesNow({ randomLevelCrateAnimation: checked });
      }
    },
    [savePreferencesNow, user],
  );

  const setRandomLevelCrateSound = useCallback(
    (checked: boolean) => {
      setRandomLevelCrateSoundState(checked);
      if (user) {
        void savePreferencesNow({ randomLevelCrateSound: checked });
      }
    },
    [savePreferencesNow, user],
  );

  const resetToDefaults = useCallback(() => {
    const defaults = defaultUserPreferences();
    skipSaveRef.current = true;
    savingRef.current = true;
    setFilters(levelFiltersFromStored(defaults.filters));
    setSortDirection(defaults.sortDirection);
    setSortMode(defaults.sortMode);
    if (user) {
      const payload = {
        ...defaults,
        randomLevelCrateAnimation,
        randomLevelCrateSound,
      };
      savingRef.current = true;
      putPreferences(payload)
        .then((updated) => {
          markSynced(updated, updated.preferences);
          setUser?.(updated);
        })
        .catch((error) => {
          console.error('Failed to reset preferences', error);
        })
        .finally(() => {
          savingRef.current = false;
          skipSaveRef.current = false;
        });
    } else {
      skipSaveRef.current = false;
    }
  }, [
    markSynced,
    randomLevelCrateAnimation,
    randomLevelCrateSound,
    setUser,
    user,
  ]);

  return {
    filters,
    setFilter,
    sortDirection,
    sortMode,
    toggleSortDirection,
    toggleSortMode,
    resetToDefaults,
    randomLevelCrateAnimation,
    setRandomLevelCrateAnimation,
    randomLevelCrateSound,
    setRandomLevelCrateSound,
  };
}

export type UserPreferencesHandle = ReturnType<typeof useUserPreferences>;
