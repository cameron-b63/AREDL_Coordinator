import { useEffect, useState } from 'preact/hooks';
import {
  API_URL,
  fetchAredlPing,
  fetchHealth,
  type AredlPingResponse,
  type HealthResponse,
} from './lib/api';

type CheckState = 'loading' | 'ok' | 'error';

interface CheckResult {
  state: CheckState;
  detail: string;
}

function IconOk() {
  return (
    <svg class="status-icon status-icon--ok" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5" />
      <path d="M6 10.5l2.5 2.5 5.5-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}

function IconError() {
  return (
    <svg class="status-icon status-icon--error" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5" />
      <path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </svg>
  );
}

function IconPending() {
  return (
    <svg class="status-icon status-icon--pending spinner" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5" stroke-dasharray="32" stroke-linecap="round" />
    </svg>
  );
}

function StatusIcon({ state }: { state: CheckState }) {
  if (state === 'ok') return <IconOk />;
  if (state === 'error') return <IconError />;
  return <IconPending />;
}

function StatusRow({ label, result }: { label: string; result: CheckResult }) {
  return (
    <li class="status-row">
      <StatusIcon state={result.state} />
      <span class="status-row__label">{label}</span>
      <span class="status-row__detail">{result.detail}</span>
    </li>
  );
}

function formatHealth(data: HealthResponse): string {
  return `${data.service} — ${data.status}`;
}

function formatAredlPing(data: AredlPingResponse): string {
  return data.ok ? `HTTP ${data.upstream_status}` : `HTTP ${data.upstream_status} (failed)`;
}

export function App() {
  const [backend, setBackend] = useState<CheckResult>({
    state: 'loading',
    detail: 'Checking…',
  });
  const [aredl, setAredl] = useState<CheckResult>({
    state: 'loading',
    detail: 'Checking…',
  });

  useEffect(() => {
    let cancelled = false;

    async function runChecks() {
      const [healthResult, pingResult] = await Promise.allSettled([
        fetchHealth(),
        fetchAredlPing(),
      ]);

      if (cancelled) return;

      if (healthResult.status === 'fulfilled') {
        setBackend({ state: 'ok', detail: formatHealth(healthResult.value) });
      } else {
        setBackend({ state: 'error', detail: 'Unreachable' });
      }

      if (pingResult.status === 'fulfilled') {
        const value = pingResult.value;
        setAredl({
          state: value.ok ? 'ok' : 'error',
          detail: formatAredlPing(value),
        });
      } else {
        setAredl({ state: 'error', detail: 'Unreachable' });
      }
    }

    runChecks();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main class="page">
      <div class="card">
        <h1 class="card__title">AREDL Coordinator</h1>
        <p class="card__subtitle">Deployment connectivity check</p>

        <h2 class="section-title">Services</h2>
        <ul class="status-list">
          <StatusRow label="Backend API" result={backend} />
          <StatusRow label="AREDL API" result={aredl} />
        </ul>

        <p class="footer">API: {API_URL}</p>
      </div>
    </main>
  );
}
