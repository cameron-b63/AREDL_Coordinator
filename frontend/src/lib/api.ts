import { authHeaders, clearSessionToken } from './session';
import type { ClaimKind } from './types/claim';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorBody {
  error?: string;
  message?: string;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as ErrorBody;
    if (body.message) return body.message;
  } catch {
    // ignore parse failures
  }
  return fallback;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      ...init,
      headers: {
        ...authHeaders(),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError('Network request failed — check your connection and try again.', 0);
  }

  if (!response.ok) {
    const fallback = `${path} returned ${response.status}`;
    const message = await readErrorMessage(response, fallback);
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export interface HealthResponse {
  status: string;
  service: string;
}

export interface AredlPingResponse {
  ok: boolean;
  upstream_status: number;
}

export function fetchHealth() {
  return apiFetch<HealthResponse>('/api/health');
}

export function fetchAredlPing() {
  return apiFetch<AredlPingResponse>('/api/aredl/ping');
}

export function fetchLevels(excludeLegacy = true) {
  const query = excludeLegacy ? '?exclude_legacy=true' : '';
  return apiFetch<import('./types/level').Level[]>(`/api/aredl/levels${query}`);
}

export function fetchBoard(excludeLegacy = true) {
  const query = excludeLegacy ? '?exclude_legacy=true' : '';
  return apiFetch<import('./types/board').BoardResponse>(`/api/board${query}`);
}

export interface ShowcaseVideoResponse {
  videoUrl: string;
}

export function fetchShowcaseVideo(levelId: string) {
  return apiFetch<ShowcaseVideoResponse>(`/api/levels/${encodeURIComponent(levelId)}/showcase`);
}

export async function fetchMe(): Promise<import('./types/user').User | null> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/me`, {
      credentials: 'include',
      headers: authHeaders(),
    });
  } catch {
    return null;
  }

  if (response.status === 401) {
    clearSessionToken();
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as import('./types/user').MeResponse;
  const user = data.user;
  if (!user) return null;
  return { ...user, isAdmin: user.isAdmin ?? false, claims: user.claims ?? [] };
}

export function signInUrl(): string {
  return `${API_URL}/auth/discord`;
}

export function signOutUrl(): string {
  return `${API_URL}/auth/logout`;
}

export function submitClaim(levelId: string, kind: ClaimKind) {
  return apiFetch<void>('/api/claims', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ levelId, kind }),
  });
}

export function removeClaim(levelId: string) {
  return apiFetch<void>(`/api/claims/${encodeURIComponent(levelId)}`, {
    method: 'DELETE',
  });
}

export function adminResetClaim(levelId: string) {
  return apiFetch<void>(`/api/admin/claims/${encodeURIComponent(levelId)}`, {
    method: 'DELETE',
  });
}

export interface PruneClaimsResponse {
  pruned: number;
}

export function adminPruneClaims() {
  return apiFetch<PruneClaimsResponse>('/api/admin/prune-claims', {
    method: 'POST',
  });
}

export { API_URL };
