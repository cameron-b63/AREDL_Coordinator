export type CompletionState = 'uncompleted' | 'completed';

export interface Completer {
  username: string;
  avatarUrl: string | null;
}

export interface CompletionInfo {
  state: CompletionState;
  by?: Completer;
}

export interface ClaimInfo {
  menuEnabled: boolean;
  active: ActiveClaim | null;
}

export interface ActiveClaim {
  kind: string;
  claimedBy: Completer;
}

export interface BoardLevel {
  id: string;
  position: number;
  name: string;
  completion: CompletionInfo;
  claim: ClaimInfo;
}

export interface BoardResponse {
  levels: BoardLevel[];
}

export function levelIsCompleted(level: BoardLevel): boolean {
  return level.completion.state === 'completed';
}
