import type { BoardLevel } from './types/board';
import { levelIsCompleted } from './types/board';

export interface UserTagStats {
  completedOnBoard: number;
  topTags: { tag: string; count: number }[];
  pointsFromCompleted: number;
}

function userCompletedLevel(level: BoardLevel, discordId: string): boolean {
  return (
    levelIsCompleted(level) && level.completion.by?.discordId === discordId
  );
}

export function computeUserTagStats(
  levels: BoardLevel[],
  discordId: string,
): UserTagStats {
  const userLevels = levels.filter((level) =>
    userCompletedLevel(level, discordId),
  );

  const tagCounts = new Map<string, number>();
  let pointsFromCompleted = 0;

  for (const level of userLevels) {
    pointsFromCompleted += level.points;

    for (const tag of level.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));

  return {
    completedOnBoard: userLevels.length,
    topTags,
    pointsFromCompleted,
  };
}
