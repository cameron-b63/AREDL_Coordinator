import { useCallback, useState } from 'preact/hooks';
import {
  DEFAULT_LEVEL_FILTERS,
  type LevelFilters,
} from '../lib/types/filters';

export function useFilters() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<LevelFilters>(DEFAULT_LEVEL_FILTERS);

  const toggleFilters = useCallback(() => {
    setFiltersOpen((open) => !open);
  }, []);

  const closeFilters = useCallback(() => {
    setFiltersOpen(false);
  }, []);

  const setFilter = useCallback(<K extends keyof LevelFilters>(key: K, value: LevelFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  return {
    filtersOpen,
    toggleFilters,
    closeFilters,
    filters,
    setFilter,
  };
}
