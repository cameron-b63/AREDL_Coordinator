import { claimPriority, isClaimKind } from './types/claim';
import type { BoardLevel } from './types/board';
import { levelIsCompleted } from './types/board';
import type { LevelFilters } from './types/filters';
import type { User } from './types/user';

export type MaxClaimTier = 'none' | 'begrudgingly_earmarked' | 'claimed' | 'locked_down';

export type PositionRange = Pick<LevelFilters, 'positionMin' | 'positionMax'>;

interface RandomLevelTier {
  excludeNewHardests: boolean;
  maxClaim: MaxClaimTier;
}

const RANDOM_LEVEL_TIERS: RandomLevelTier[] = [
  { excludeNewHardests: true, maxClaim: 'none' },
  { excludeNewHardests: true, maxClaim: 'begrudgingly_earmarked' },
  { excludeNewHardests: true, maxClaim: 'claimed' },
  { excludeNewHardests: true, maxClaim: 'locked_down' },
  { excludeNewHardests: false, maxClaim: 'locked_down' },
];

export function isNewHardestForUser(level: BoardLevel, user: User | null): boolean {
  const hardestPosition = user?.hardest?.position ?? null;
  return hardestPosition !== null && level.position < hardestPosition;
}

export function levelInPositionRange(level: BoardLevel, range: PositionRange): boolean {
  if (range.positionMin !== null && level.position < range.positionMin) {
    return false;
  }
  if (range.positionMax !== null && level.position > range.positionMax) {
    return false;
  }
  return true;
}

export function levelMatchesClaimTier(level: BoardLevel, maxTier: MaxClaimTier): boolean {
  const active = level.claim.active;
  if (!active) {
    return true;
  }

  if (!isClaimKind(active.kind)) {
    return false;
  }

  if (maxTier === 'none') {
    return false;
  }

  return claimPriority(active.kind) <= claimPriority(maxTier);
}

function levelInBasePool(level: BoardLevel, range: PositionRange): boolean {
  return !levelIsCompleted(level) && levelInPositionRange(level, range);
}

function candidatesForTier(
  levels: BoardLevel[],
  user: User | null,
  range: PositionRange,
  tier: RandomLevelTier,
): BoardLevel[] {
  return levels.filter((level) => {
    if (!levelInBasePool(level, range)) {
      return false;
    }
    if (tier.excludeNewHardests && isNewHardestForUser(level, user)) {
      return false;
    }
    return levelMatchesClaimTier(level, tier.maxClaim);
  });
}

export function pickRandomLevel(
  levels: BoardLevel[],
  user: User | null,
  range: PositionRange,
): BoardLevel | null {
  for (const tier of RANDOM_LEVEL_TIERS) {
    const candidates = candidatesForTier(levels, user, range, tier);
    if (candidates.length === 0) {
      continue;
    }
    return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
  }
  return null;
}

export function canPickRandomLevel(
  levels: BoardLevel[],
  user: User | null,
  range: PositionRange,
): boolean {
  return RANDOM_LEVEL_TIERS.some(
    (tier) => candidatesForTier(levels, user, range, tier).length > 0,
  );
}
