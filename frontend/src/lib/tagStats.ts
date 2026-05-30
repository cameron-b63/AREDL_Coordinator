import type { BoardLevel } from './types/board';
import { levelIsCompleted } from './types/board';

const LENGTH_RANK: Record<string, number> = {
  Tiny: 0,
  Short: 1,
  Medium: 2,
  Long: 3,
  XL: 4,
};

export interface UserTagStats {
  completedOnBoard: number;
  longestLengthTag: string | null;
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
  let longestLengthTag: string | null = null;
  let longestRank = -1;
  let pointsFromCompleted = 0;

  for (const level of userLevels) {
    pointsFromCompleted += level.points;

    for (const tag of level.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);

      const rank = LENGTH_RANK[tag];
      if (rank !== undefined && rank > longestRank) {
        longestRank = rank;
        longestLengthTag = tag;
      }
    }
  }

  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));

  return {
    completedOnBoard: userLevels.length,
    longestLengthTag,
    topTags,
    pointsFromCompleted,
  };
}
