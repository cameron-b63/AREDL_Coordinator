import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { putPreferences } from '../lib/api';
import {
  defaultUserPreferences,
  levelFiltersFromStored,
  storedFromLevelFilters,
} from '../lib/types/preferences';
import {
  DEFAULT_LEVEL_FILTERS,
  type LevelFilters,
} from '../lib/types/filters';
import {
  DEFAULT_SORT_DIRECTION,
  type SortDirection,
} from '../lib/types/sort';
import type { User } from '../lib/types/user';

const SAVE_DEBOUNCE_MS = 400;

export function useUserPreferences(user: User | null | undefined) {
  const [filters, setFilters] = useState<LevelFilters>(DEFAULT_LEVEL_FILTERS);
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(DEFAULT_SORT_DIRECTION);
  const hydratedForUserId = useRef<string | null>(null);
  const skipSaveRef = useRef(true);

  useEffect(() => {
    if (user === undefined) {
      return;
    }

    const userId = user?.id ?? null;
    if (hydratedForUserId.current === userId) {
      return;
    }
    hydratedForUserId.current = userId;
    skipSaveRef.current = true;

    if (!user) {
      setFilters(DEFAULT_LEVEL_FILTERS);
      setSortDirection(DEFAULT_SORT_DIRECTION);
    } else {
      const prefs = user.preferences ?? defaultUserPreferences();
      setFilters(levelFiltersFromStored(prefs.filters));
      setSortDirection(prefs.sortDirection);
    }

    const timer = window.setTimeout(() => {
      skipSaveRef.current = false;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    if (skipSaveRef.current || !user) {
      return;
    }

    const payload = {
      filters: storedFromLevelFilters(filters),
      sortDirection,
    };

    const timer = window.setTimeout(() => {
      putPreferences(payload).catch((error) => {
        console.error('Failed to save preferences', error);
      });
    }, SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [filters, sortDirection, user]);

  const setFilter = useCallback(<K extends keyof LevelFilters>(key: K, value: LevelFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const toggleSortDirection = useCallback(() => {
    setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
  }, []);

  const resetToDefaults = useCallback(() => {
    const defaults = defaultUserPreferences();
    skipSaveRef.current = true;
    setFilters(levelFiltersFromStored(defaults.filters));
    setSortDirection(defaults.sortDirection);
    if (user) {
      putPreferences(defaults)
        .catch((error) => {
          console.error('Failed to reset preferences', error);
        })
        .finally(() => {
          skipSaveRef.current = false;
        });
    } else {
      skipSaveRef.current = false;
    }
  }, [user]);

  return {
    filters,
    setFilter,
    sortDirection,
    toggleSortDirection,
    resetToDefaults,
  };
}
