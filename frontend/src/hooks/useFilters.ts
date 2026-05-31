import { useCallback, useState } from 'preact/hooks';

export function useFilters() {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const toggleFilters = useCallback(() => {
    setFiltersOpen((open) => !open);
  }, []);

  const closeFilters = useCallback(() => {
    setFiltersOpen(false);
  }, []);

  return {
    filtersOpen,
    toggleFilters,
    closeFilters,
  };
}
