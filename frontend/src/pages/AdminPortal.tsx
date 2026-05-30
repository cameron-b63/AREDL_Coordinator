import { useState } from 'preact/hooks';
import { AppLayout } from '../components/layout/AppLayout';
import { Header } from '../components/layout/Header';
import { useAuth } from '../hooks/useAuth';
import { adminPruneClaims, ApiError } from '../lib/api';

function homePath(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return base || '/';
}

export function AdminPortal() {
  const { user } = useAuth();
  const [pruning, setPruning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePrune() {
    const confirmed = window.confirm(
      'Remove all claims from users who no longer have the coordinator Discord role?',
    );
    if (!confirmed) return;

    setPruning(true);
    setError(null);
    setResult(null);
    try {
      const response = await adminPruneClaims();
      setResult(`Pruned ${response.pruned} claim${response.pruned === 1 ? '' : 's'}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to prune claims');
    } finally {
      setPruning(false);
    }
  }

  const authorized = user?.isAdmin === true;

  return (
    <AppLayout
      header={
        <Header
          searchQuery=""
          onSearchChange={() => {}}
          user={user}
          filtersOpen={false}
          onToggleFilters={() => {}}
          statsOpen={false}
          onToggleStats={() => {}}
          adminPage
        />
      }
    >
      <div class="admin-portal">
        <h1 class="admin-portal__title">Admin Portal</h1>

        {user === undefined ? (
          <p class="admin-portal__message">Loading…</p>
        ) : !authorized ? (
          <div class="admin-portal__denied">
            <p class="admin-portal__message">You are not authorized to view this page.</p>
            <a class="admin-portal__link" href={homePath()}>
              Back to board
            </a>
          </div>
        ) : (
          <>
            <section class="admin-portal__section">
              <h2 class="admin-portal__section-title">Stale claims</h2>
              <p class="admin-portal__description">
                Remove claims held by users who no longer have the coordinator Discord role.
              </p>
              <button
                type="button"
                class="admin-portal__action"
                disabled={pruning}
                onClick={handlePrune}
              >
                {pruning ? 'Pruning…' : 'Prune stale claims'}
              </button>
              {result ? <p class="admin-portal__success">{result}</p> : null}
              {error ? <p class="admin-portal__error">{error}</p> : null}
            </section>
            <p class="admin-portal__footer">
              <a class="admin-portal__link" href={homePath()}>
                Back to board
              </a>
            </p>
          </>
        )}
      </div>
    </AppLayout>
  );
}
