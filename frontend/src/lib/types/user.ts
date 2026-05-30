export interface User {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface MeResponse {
  user: User | null;
}
