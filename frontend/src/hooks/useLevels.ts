import { useEffect, useMemo, useState } from 'preact/hooks';
import { fetchLevels } from '../lib/api';
import type { Level } from '../lib/types/level';

export type LevelsState =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'ready'; levels: Level[] };

export function useLevels() {
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
        const message = error instanceof Error ? error.message : 'Failed to load levels';
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
    if (!trimmed) return state.levels;

    return state.levels.filter((level) => {
      const haystack = `#${level.position} ${level.name}`.toLowerCase();
      return haystack.includes(trimmed);
    });
  }, [state, query]);

  return {
    state,
    query,
    setQuery,
    filteredLevels,
  };
}
