import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { fetchBoard, ApiError } from '../lib/api';
import type { ActiveClaim, BoardLevel, BoardSummary } from '../lib/types/board';
import { applyLevelFilters } from '../lib/types/filters';
import type { LevelFilters } from '../lib/types/filters';
import { sortLevelsByPosition, sortLevelsByRecordDate } from '../lib/types/sort';
import type { SortDirection, SortMode } from '../lib/types/sort';
import type { User } from '../lib/types/user';

export type LevelsState =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'ready'; levels: BoardLevel[]; summary: BoardSummary };

export function useLevels(
  filters: LevelFilters,
  sortMode: SortMode,
  sortDirection: SortDirection,
  user: User | null,
) {
  const [state, setState] = useState<LevelsState>({ status: 'loading' });
  const [query, setQuery] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((current) =>
        current.status === 'ready' ? current : { status: 'loading' },
      );

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
    const filtered = applyLevelFilters(state.levels, filters, user, query);
    if (sortMode === 'record_date') {
      return sortLevelsByRecordDate(filtered, sortDirection);
    }
    return sortLevelsByPosition(filtered, sortDirection);
  }, [state, query, filters, sortMode, sortDirection, user]);

  const summary = state.status === 'ready' ? state.summary : null;

  const patchLevelClaim = useCallback(
    (levelId: string, active: ActiveClaim | null) => {
      setState((current) => {
        if (current.status !== 'ready') return current;
        return {
          ...current,
          levels: current.levels.map((level) =>
            level.id === levelId
              ? {
                  ...level,
                  claim: {
                    ...level.claim,
                    active,
                  },
                }
              : level,
          ),
        };
      });
    },
    [],
  );

  return {
    state,
    summary,
    query,
    setQuery,
    filteredLevels,
    patchLevelClaim,
    reload: () => setReloadToken((value) => value + 1),
  };
}
