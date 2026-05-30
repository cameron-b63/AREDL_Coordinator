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

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);

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

export { API_URL };
