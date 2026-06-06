export type ClaimKind =
  | 'begrudgingly_earmarked'
  | 'claimed'
  | 'locked_down'
  | 'supposedly_completed';

export type AssignmentKind = 'completed' | ClaimKind;

export interface LevelAssignment {
  kind: AssignmentKind;
  username: string | null;
}

export const CLAIM_OPTIONS: { value: ClaimKind; label: string }[] = [
  { value: 'begrudgingly_earmarked', label: 'Begrudgingly Earmarked' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'locked_down', label: 'Locked Down' },
  { value: 'supposedly_completed', label: 'Supposedly Completed' },
];

const STATUS_LABELS: Record<AssignmentKind, string> = {
  completed: 'Completed',
  begrudgingly_earmarked: 'Begrudgingly Earmarked',
  claimed: 'Claimed',
  locked_down: 'Locked Down',
  supposedly_completed: 'Supposedly Completed',
};

const CLAIM_PRIORITY: Record<ClaimKind, number> = {
  begrudgingly_earmarked: 1,
  claimed: 2,
  locked_down: 3,
  supposedly_completed: 4,
};

export function defaultAssignment(): LevelAssignment {
  return { kind: 'completed', username: null };
}

export function formatStatusLine(assignment: LevelAssignment): string {
  const label = STATUS_LABELS[assignment.kind];
  const who = assignment.username ?? 'Nobody Yet!';
  return `${label} By: ${who}`;
}

export function claimKindLabel(kind: string): string {
  if (kind in STATUS_LABELS && kind !== 'completed') {
    return STATUS_LABELS[kind as ClaimKind];
  }
  return kind;
}

export function isClaimKind(kind: string): kind is ClaimKind {
  return kind in CLAIM_PRIORITY;
}

export function claimPriority(kind: ClaimKind): number {
  return CLAIM_PRIORITY[kind];
}

export function canSetClaimKind(
  ownKind: ClaimKind | null,
  targetKind: ClaimKind,
  dominantKind: ClaimKind | null,
): boolean {
  if (ownKind) {
    return true;
  }
  if (!dominantKind) {
    return true;
  }
  return CLAIM_PRIORITY[targetKind] > CLAIM_PRIORITY[dominantKind];
}

export function claimStrengthClass(kind: ClaimKind): string {
  return `assignee-bubble--claim-${kind.replace(/_/g, '-')}`;
}

export function levelHasActiveClaim(_levelId: string): boolean {
  return false;
}
