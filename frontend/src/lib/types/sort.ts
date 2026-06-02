export type SortDirection = 'asc' | 'desc';
export type SortMode = 'position' | 'record_date';

export const DEFAULT_SORT_DIRECTION: SortDirection = 'asc';
export const DEFAULT_SORT_MODE: SortMode = 'position';

export function sortLevelsByPosition<T extends { position: number }>(
  levels: T[],
  direction: SortDirection,
): T[] {
  const sorted = [...levels];
  sorted.sort((a, b) =>
    direction === 'asc' ? a.position - b.position : b.position - a.position,
  );
  return sorted;
}

export function sortLevelsByRecordDate<T extends { recordAchievedAt?: string }>(
  levels: T[],
  direction: SortDirection,
): T[] {
  const withRecordDate = levels.filter(
    (level): level is T & { recordAchievedAt: string } =>
      typeof level.recordAchievedAt === 'string' && level.recordAchievedAt.length > 0,
  );
  const sorted = [...withRecordDate];
  sorted.sort((a, b) =>
    direction === 'asc'
      ? a.recordAchievedAt.localeCompare(b.recordAchievedAt)
      : b.recordAchievedAt.localeCompare(a.recordAchievedAt),
  );
  return sorted;
}
