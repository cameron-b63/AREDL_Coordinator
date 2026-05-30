export type CompletionState = 'uncompleted' | 'completed';

export interface Completer {
  username: string;
  avatarUrl: string | null;
  discordId: string;
}

export interface CompletionInfo {
  state: CompletionState;
  by?: Completer;
  videoUrl?: string;
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
  points: number;
  gameLevelId: number;
  twoPlayer: boolean;
  tags: string[];
  verificationUrl: string;
  completion: CompletionInfo;
  claim: ClaimInfo;
}

export interface BoardSummary {
  completedCount: number;
  totalCount: number;
}

export interface BoardResponse {
  summary: BoardSummary;
  levels: BoardLevel[];
}

export function levelIsCompleted(level: BoardLevel): boolean {
  return level.completion.state === 'completed';
}
