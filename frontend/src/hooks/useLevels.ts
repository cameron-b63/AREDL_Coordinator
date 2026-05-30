import { useEffect, useMemo, useState } from 'preact/hooks';
import { fetchBoard, ApiError } from '../lib/api';
import type { BoardLevel, BoardSummary } from '../lib/types/board';
import { applyLevelFilters } from '../lib/types/filters';
import type { LevelFilters } from '../lib/types/filters';
import type { User } from '../lib/types/user';

export type LevelsState =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'ready'; levels: BoardLevel[]; summary: BoardSummary };

export function useLevels(filters: LevelFilters, user: User | null) {
  const [state, setState] = useState<LevelsState>({ status: 'loading' });
  const [query, setQuery] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: 'loading' });

      try {
        const board = await fetchBoard(true);
        if (cancelled) return;
        setState({
          status: 'ready',
          levels: board.levels,
          summary: board.summary,
        });
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
    return applyLevelFilters(state.levels, filters, user, query);
  }, [state, query, filters, user]);

  const summary = state.status === 'ready' ? state.summary : null;

  return {
    state,
    summary,
    query,
    setQuery,
    filteredLevels,
  };
}
