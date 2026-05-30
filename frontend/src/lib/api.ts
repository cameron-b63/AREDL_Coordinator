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
  const response = await fetch(`${API_URL}${path}`, init);

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
  const response = await fetch(`${API_URL}/api/me`, { credentials: 'include' });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new ApiError(`/api/me returned ${response.status}`, response.status);
  }

  const data = (await response.json()) as import('./types/user').MeResponse;
  return data.user;
}

export function signInUrl(): string {
  return `${API_URL}/auth/discord`;
}

export { API_URL };
