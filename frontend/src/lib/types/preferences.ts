import { isClaimKind, type ClaimKind } from './claim';
import {
  DEFAULT_LEVEL_FILTERS,
  type LevelFilters,
} from './filters';
import {
  DEFAULT_SORT_DIRECTION,
  DEFAULT_SORT_MODE,
  type SortDirection,
  type SortMode,
} from './sort';

export interface StoredLevelFilters {
  excludeCompleted: boolean;
  excludeNewHardests: boolean;
  onlyMyCompletions: boolean;
  onlyUnclaimed: boolean;
  boardClaimKinds: string[];
  onlyMine: boolean;
  positionMin?: number | null;
  positionMax?: number | null;
}

export interface UserPreferences {
  filters: StoredLevelFilters;
  sortDirection: SortDirection;
  sortMode: SortMode;
}

export function defaultUserPreferences(): UserPreferences {
  return {
    filters: storedFromLevelFilters(DEFAULT_LEVEL_FILTERS),
    sortDirection: DEFAULT_SORT_DIRECTION,
    sortMode: DEFAULT_SORT_MODE,
  };
}

export function storedFromLevelFilters(filters: LevelFilters): StoredLevelFilters {
  return {
    excludeCompleted: filters.excludeCompleted,
    excludeNewHardests: filters.excludeNewHardests,
    onlyMyCompletions: filters.onlyMyCompletions,
    onlyUnclaimed: filters.onlyUnclaimed,
    boardClaimKinds: [...filters.boardClaimKinds],
    onlyMine: filters.onlyMine,
    positionMin: filters.positionMin,
    positionMax: filters.positionMax,
  };
}

export function levelFiltersFromStored(stored: StoredLevelFilters): LevelFilters {
  const boardClaimKinds = stored.boardClaimKinds.filter((kind): kind is ClaimKind =>
    isClaimKind(kind),
  );
  return {
    excludeCompleted: stored.excludeCompleted,
    excludeNewHardests: stored.excludeNewHardests,
    onlyMyCompletions: stored.onlyMyCompletions,
    onlyUnclaimed: stored.onlyUnclaimed,
    boardClaimKinds,
    onlyMine: stored.onlyMine,
    positionMin: stored.positionMin ?? null,
    positionMax: stored.positionMax ?? null,
  };
}

export function normalizeUserPreferences(
  raw: UserPreferences | undefined,
): UserPreferences {
  if (!raw?.filters) {
    return defaultUserPreferences();
  }
  const sortDirection =
    raw.sortDirection === 'desc' ? 'desc' : DEFAULT_SORT_DIRECTION;
  const sortMode =
    raw.sortMode === 'record_date' ? 'record_date' : DEFAULT_SORT_MODE;
  return {
    filters: {
      ...defaultUserPreferences().filters,
      ...raw.filters,
      boardClaimKinds: raw.filters.boardClaimKinds ?? [],
    },
    sortDirection,
    sortMode,
  };
}
