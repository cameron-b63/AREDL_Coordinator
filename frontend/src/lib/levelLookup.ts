import type { Level } from './types/level';

export function resolveLevelNameByPosition(
  levels: Level[] | null,
  position: number | null,
): string | null {
  if (levels == null || position == null || position < 1) {
    return null;
  }
  return levels.find((level) => level.position === position)?.name ?? null;
}
