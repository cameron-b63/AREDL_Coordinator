export type SortDirection = 'asc' | 'desc';

export const DEFAULT_SORT_DIRECTION: SortDirection = 'asc';

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
