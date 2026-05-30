import type { BoardLevel } from './types/board';
import { levelIsCompleted } from './types/board';
import type { User } from './types/user';
import { userClaimForLevel } from './types/user';

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

function userSupposedlyCompletedLevel(user: User, level: BoardLevel): boolean {
  if (levelIsCompleted(level)) {
    return false;
  }
  return userClaimForLevel(user, level.id) === 'supposedly_completed';
}

function levelCountsForTags(
  level: BoardLevel,
  user: User,
  includeSupposedlyCompleted: boolean,
): boolean {
  if (userCompletedLevel(level, user.discordId)) {
    return true;
  }
  return includeSupposedlyCompleted && userSupposedlyCompletedLevel(user, level);
}

export function computeUserTagStats(
  levels: BoardLevel[],
  user: User,
  includeSupposedlyCompleted = false,
): UserTagStats {
  const userLevels = levels.filter((level) =>
    userCompletedLevel(level, user.discordId),
  );

  const tagLevels = levels.filter((level) =>
    levelCountsForTags(level, user, includeSupposedlyCompleted),
  );

  const tagCounts = new Map<string, number>();
  let pointsFromCompleted = 0;

  for (const level of userLevels) {
    pointsFromCompleted += level.points;
  }

  for (const level of tagLevels) {
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
