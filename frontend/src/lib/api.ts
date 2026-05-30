import { authHeaders, clearSessionToken } from './session';

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
    throw new ApiError(`${path} returned ${response.status}`, response.status);
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
  return data.user;
}

export function signInUrl(): string {
  return `${API_URL}/auth/discord`;
}

export function signOutUrl(): string {
  return `${API_URL}/auth/logout`;
}

export { API_URL };
