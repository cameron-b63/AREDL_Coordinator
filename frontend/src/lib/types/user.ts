export interface ViewerStats {
  levelsContributed: number;
  pointsEarned: number;
}

export interface User {
  id: string;
  discordId: string;
  username: string;
  avatarUrl: string | null;
  stats: ViewerStats;
}

export interface MeResponse {
  user: User | null;
}
