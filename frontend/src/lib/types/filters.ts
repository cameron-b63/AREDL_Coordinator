export interface LevelFilters {
  excludeCompleted: boolean;
}

export const DEFAULT_LEVEL_FILTERS: LevelFilters = {
  excludeCompleted: false,
};

/** Stub until completion data exists in D1/API. */
export function levelIsCompleted(_levelId: string): boolean {
  return false;
}
