import { isClaimKind, type ClaimKind } from './claim';
import type { BoardLevel, Completer } from './board';
import type { User } from './user';
import { levelIsCompleted } from './board';
import { userHasClaimOnLevel } from './user';

export type SearchQueryMode = 'text' | 'user';

export interface ParsedSearchQuery {
  mode: SearchQueryMode;
  needle: string;
}

export function parseSearchQuery(query: string): ParsedSearchQuery {
  const trimmed = query.trim();
  if (trimmed.startsWith('@')) {
    return { mode: 'user', needle: trimmed.slice(1).trim().toLowerCase() };
  }
  return { mode: 'text', needle: trimmed.toLowerCase() };
}

export function formatUserSearchQuery(username: string): string {
  return `@${username}`;
}

export function usernameMatches(
  completer: Completer | undefined,
  needle: string,
): boolean {
  if (!completer || !needle) {
    return false;
  }
  return completer.username.toLowerCase().startsWith(needle);
}

export function levelMatchesUserSearch(level: BoardLevel, needle: string): boolean {
  if (!needle) {
    return false;
  }
  if (levelIsCompleted(level)) {
    return usernameMatches(level.completion.by, needle);
  }
  return usernameMatches(level.claim.active?.claimedBy, needle);
}

export function levelMatchesTextSearch(level: BoardLevel, needle: string): boolean {
  const idStr = String(level.gameLevelId);
  if (needle === idStr || idStr.startsWith(needle)) {
    return true;
  }
  const haystack = `#${level.position} ${level.name}`.toLowerCase();
  return haystack.includes(needle);
}

export interface LevelFilters {
  excludeCompleted: boolean;
  excludeNewHardests: boolean;
  onlyMyCompletions: boolean;
  onlyUnclaimed: boolean;
  boardClaimKinds: ClaimKind[];
  onlyMine: boolean;
  positionMin: number | null;
  positionMax: number | null;
}

export const DEFAULT_LEVEL_FILTERS: LevelFilters = {
  excludeCompleted: false,
  excludeNewHardests: false,
  onlyMyCompletions: false,
  onlyUnclaimed: false,
  boardClaimKinds: [],
  onlyMine: false,
  positionMin: null,
  positionMax: null,
};

export function filtersAreActive(filters: LevelFilters): boolean {
  return (
    filters.excludeCompleted ||
    filters.excludeNewHardests ||
    filters.onlyMyCompletions ||
    filters.onlyUnclaimed ||
    filters.onlyMine ||
    filters.boardClaimKinds.length > 0 ||
    filters.positionMin !== null ||
    filters.positionMax !== null
  );
}

export function applyLevelFilters(
  levels: BoardLevel[],
  filters: LevelFilters,
  user: User | null,
  searchQuery: string,
): BoardLevel[] {
  const { mode, needle } = parseSearchQuery(searchQuery);
  const hardestPosition = user?.hardest?.position ?? null;

  return levels.filter((level) => {
    if (filters.excludeCompleted && levelIsCompleted(level)) {
      return false;
    }

    if (
      filters.excludeNewHardests &&
      hardestPosition !== null &&
      level.position < hardestPosition
    ) {
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

    if (filters.boardClaimKinds.length > 0) {
      const kind = level.claim.active?.kind;
      if (!kind || !isClaimKind(kind) || !filters.boardClaimKinds.includes(kind)) {
        return false;
      }
    }

    if (filters.onlyMine) {
      if (!user || !userHasClaimOnLevel(user, level.id)) {
        return false;
      }
    }

    if (filters.positionMin !== null && level.position < filters.positionMin) {
      return false;
    }
    if (filters.positionMax !== null && level.position > filters.positionMax) {
      return false;
    }

    if (needle) {
      if (mode === 'user') {
        if (!levelMatchesUserSearch(level, needle)) {
          return false;
        }
      } else if (!levelMatchesTextSearch(level, needle)) {
        return false;
      }
    }

    return true;
  });
}

export function toggleBoardClaimKind(
  current: ClaimKind[],
  kind: ClaimKind,
): ClaimKind[] {
  return current.includes(kind)
    ? current.filter((value) => value !== kind)
    : [...current, kind];
}
