import type { ClaimKind } from './claim';
import type { BoardLevel } from './board';
import type { User } from './user';
import { levelIsCompleted } from './board';

export type ClaimFilter = ClaimKind | 'any' | 'mine';

export interface LevelFilters {
  excludeCompleted: boolean;
  onlyMyCompletions: boolean;
  onlyUnclaimed: boolean;
  claimFilter: ClaimFilter;
  positionMin: number | null;
  positionMax: number | null;
}

export const DEFAULT_LEVEL_FILTERS: LevelFilters = {
  excludeCompleted: false,
  onlyMyCompletions: false,
  onlyUnclaimed: false,
  claimFilter: 'any',
  positionMin: null,
  positionMax: null,
};

export function applyLevelFilters(
  levels: BoardLevel[],
  filters: LevelFilters,
  user: User | null,
  searchQuery: string,
): BoardLevel[] {
  const trimmed = searchQuery.trim().toLowerCase();

  return levels.filter((level) => {
    if (filters.excludeCompleted && levelIsCompleted(level)) {
      return false;
    }

    if (filters.onlyMyCompletions) {
      if (!user || level.completion.by?.discordId !== user.discordId) {
        return false;
      }
    }

    if (filters.onlyUnclaimed) {
      if (levelIsCompleted(level) || level.claim.active !== null) {
        return false;
      }
    }

    if (filters.claimFilter !== 'any') {
      if (!user) return false;
      const active = level.claim.active;
      if (filters.claimFilter === 'mine') {
        if (!active || active.claimedBy.discordId !== user.discordId) {
          return false;
        }
      } else if (!active || active.kind !== filters.claimFilter) {
        return false;
      }
    }

    if (filters.positionMin !== null && level.position < filters.positionMin) {
      return false;
    }
    if (filters.positionMax !== null && level.position > filters.positionMax) {
      return false;
    }

    if (trimmed) {
      const haystack = `#${level.position} ${level.name}`.toLowerCase();
      if (!haystack.includes(trimmed)) {
        return false;
      }
    }

    return true;
  });
}
