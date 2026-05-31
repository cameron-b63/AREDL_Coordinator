import { useCallback, useState } from 'preact/hooks';
import {
  DEFAULT_SORT_DIRECTION,
  type SortDirection,
} from '../lib/types/sort';

export function useSortDirection() {
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(DEFAULT_SORT_DIRECTION);

  const toggleSortDirection = useCallback(() => {
    setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
  }, []);

  return {
    sortDirection,
    toggleSortDirection,
  };
}
