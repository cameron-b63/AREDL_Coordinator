import type { ClaimKind } from './claim';

export interface ViewerStats {
  levelsContributed: number;
  pointsEarned: number;
}

export interface UserClaim {
  levelId: string;
  kind: ClaimKind;
}

export interface User {
  id: string;
  discordId: string;
  username: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  stats: ViewerStats;
  claims: UserClaim[];
}

export interface MeResponse {
  user: User | null;
}

export function userClaimForLevel(user: User, levelId: string): ClaimKind | null {
  const claim = user.claims.find((entry) => entry.levelId === levelId);
  return claim?.kind ?? null;
}

export function userHasClaimOnLevel(user: User, levelId: string): boolean {
  return user.claims.some((entry) => entry.levelId === levelId);
}
