import { authHeaders, clearSessionToken } from './session';
import type { ClaimKind } from './types/claim';
import type { ClaimMutationResponse } from './types/claimMutation';
import { normalizeUserPreferences, type UserPreferences } from './types/preferences';
import type { MeResponse, User } from './types/user';

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

const showcaseUrlCache = new Map<string, string>();

export function getCachedShowcaseUrl(levelId: string): string | undefined {
  return showcaseUrlCache.get(levelId);
}

export async function fetchShowcaseVideo(levelId: string) {
  const cached = showcaseUrlCache.get(levelId);
  if (cached) return { videoUrl: cached };

  const result = await apiFetch<ShowcaseVideoResponse>(
    `/api/levels/${encodeURIComponent(levelId)}/showcase`,
  );
  showcaseUrlCache.set(levelId, result.videoUrl);
  return result;
}

function normalizeMeUser(user: NonNullable<MeResponse['user']>): User {
  return {
    ...user,
    isAdmin: user.isAdmin ?? false,
    claims: user.claims ?? [],
    aredlHardest: user.aredlHardest ?? null,
    manualHardest: user.manualHardest ?? null,
    preferences: normalizeUserPreferences(user.preferences),
  };
}

function parseMeUser(data: MeResponse): User | null {
  if (!data.user) return null;
  return normalizeMeUser(data.user);
}

export async function fetchMe(): Promise<User | null> {
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

  const data = (await response.json()) as MeResponse;
  return parseMeUser(data);
}

export async function putManualHardest(position: number): Promise<User> {
  const data = await apiFetch<MeResponse>('/api/me/manual-hardest', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ position }),
  });
  const user = parseMeUser(data);
  if (!user) {
    throw new ApiError('No user in response', 500);
  }
  return user;
}

export async function deleteManualHardest(): Promise<User> {
  const data = await apiFetch<MeResponse>('/api/me/manual-hardest', {
    method: 'DELETE',
  });
  const user = parseMeUser(data);
  if (!user) {
    throw new ApiError('No user in response', 500);
  }
  return user;
}

export async function putPreferences(preferences: UserPreferences): Promise<User> {
  const data = await apiFetch<MeResponse>('/api/me/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences),
  });
  const user = parseMeUser(data);
  if (!user) {
    throw new ApiError('No user in response', 500);
  }
  return user;
}

export function signInUrl(): string {
  const authUrl = new URL(`${API_URL}/auth/discord`);
  const returnTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
  authUrl.searchParams.set('return_to', returnTo);
  return authUrl.toString();
}

export function signOutUrl(): string {
  return `${API_URL}/auth/logout`;
}

export function submitClaim(levelId: string, kind: ClaimKind) {
  return apiFetch<ClaimMutationResponse>('/api/claims', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ levelId, kind }),
  });
}

export function removeClaim(levelId: string) {
  return apiFetch<ClaimMutationResponse>(`/api/claims/${encodeURIComponent(levelId)}`, {
    method: 'DELETE',
  });
}

export function adminResetClaim(levelId: string) {
  return apiFetch<ClaimMutationResponse>(`/api/admin/claims/${encodeURIComponent(levelId)}`, {
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

export interface ClaimsSqlQueryResult {
  kind: 'query';
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated?: boolean;
}

export interface ClaimsSqlMutationResult {
  kind: 'mutation';
  changes: number;
}

export type ClaimsSqlResult = ClaimsSqlQueryResult | ClaimsSqlMutationResult;

export function adminExecuteClaimsSql(sql: string) {
  return apiFetch<ClaimsSqlResult>('/api/admin/claims/sql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql }),
  });
}

export { API_URL };
