import type { ActiveClaim } from './board';
import type { ClaimKind } from './claim';
import type { UserClaim } from './user';

export interface ClaimMutationResponse {
  levelId: string;
  claims: UserClaim[];
  levelActive: ActiveClaim | null;
}

export function toActiveClaim(
  levelActive: ClaimMutationResponse['levelActive'],
): ActiveClaim | null {
  if (!levelActive) return null;
  return {
    kind: levelActive.kind,
    claimedBy: {
      username: levelActive.claimedBy.username,
      avatarUrl: levelActive.claimedBy.avatarUrl ?? null,
      discordId: levelActive.claimedBy.discordId,
    },
  };
}

export function normalizeUserClaims(
  claims: { levelId: string; kind: string }[],
): UserClaim[] {
  return claims.map((claim) => ({
    levelId: claim.levelId,
    kind: claim.kind as ClaimKind,
  }));
}
