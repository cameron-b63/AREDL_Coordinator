export type ClaimKind = 'begrudgingly_earmarked' | 'claimed' | 'locked_down';

export type AssignmentKind = 'completed' | ClaimKind;

export interface LevelAssignment {
  kind: AssignmentKind;
  username: string | null;
}

export const CLAIM_OPTIONS: { value: ClaimKind; label: string }[] = [
  { value: 'begrudgingly_earmarked', label: 'Begrudgingly Earmarked' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'locked_down', label: 'Locked Down' },
];

const STATUS_LABELS: Record<AssignmentKind, string> = {
  completed: 'Completed',
  begrudgingly_earmarked: 'Begrudgingly Earmarked',
  claimed: 'Claimed',
  locked_down: 'Locked Down',
};

export function defaultAssignment(): LevelAssignment {
  return { kind: 'completed', username: null };
}

export function formatStatusLine(assignment: LevelAssignment): string {
  const label = STATUS_LABELS[assignment.kind];
  const who = assignment.username ?? 'Nobody Yet!';
  return `${label} By: ${who}`;
}

/** Stub until claim data is loaded from the API. */
export function levelHasActiveClaim(_levelId: string): boolean {
  return false;
}
