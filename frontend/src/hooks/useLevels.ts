import { useEffect, useMemo, useState } from 'preact/hooks';
import { fetchLevels, ApiError } from '../lib/api';
import { levelIsCompleted, type LevelFilters } from '../lib/types/filters';
import type { Level } from '../lib/types/level';

export type LevelsState =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'ready'; levels: Level[] };

export function useLevels(filters: LevelFilters) {
  const [state, setState] = useState<LevelsState>({ status: 'loading' });
  const [query, setQuery] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: 'loading' });

      try {
        const levels = await fetchLevels(true);
        if (cancelled) return;
        setState({ status: 'ready', levels });
      } catch (error) {
        if (cancelled) return;
        let message = 'Failed to load levels';
        if (error instanceof ApiError) {
          message =
            error.status === 502
              ? 'AREDL API is temporarily unavailable. Try again shortly.'
              : error.status === 0
                ? error.message
                : `Server error (${error.status}). Try again shortly.`;
        } else if (error instanceof Error) {
          message = error.message;
        }
        setState({
          status: 'error',
          message,
          retry: () => setReloadToken((value) => value + 1),
        });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const filteredLevels = useMemo(() => {
    if (state.status !== 'ready') return [];
    const trimmed = query.trim().toLowerCase();

    return state.levels.filter((level) => {
      if (filters.excludeCompleted && levelIsCompleted(level.id)) {
        return false;
      }

      if (!trimmed) return true;

      const haystack = `#${level.position} ${level.name}`.toLowerCase();
      return haystack.includes(trimmed);
    });
  }, [state, query, filters]);

  return {
    state,
    query,
    setQuery,
    filteredLevels,
  };
}
