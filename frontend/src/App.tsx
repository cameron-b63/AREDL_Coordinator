import { useEffect, useState } from 'preact/hooks';
import { AppLayout } from './components/layout/AppLayout';
import { ClanProgress } from './components/layout/ClanProgress';
import { ContentSplit } from './components/layout/ContentSplit';
import { Header } from './components/layout/Header';
import { PlayerStatsPanel } from './components/layout/PlayerStatsPanel';
import { FiltersPanel } from './components/filters/FiltersPanel';
import { LevelList } from './components/levels/LevelList';
import { useAuth } from './hooks/useAuth';
import { useFilters } from './hooks/useFilters';
import { useLevels } from './hooks/useLevels';
import { consumeAuthErrorFromUrl } from './lib/authError';

export function App() {
  const [authError, setAuthError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const message = consumeAuthErrorFromUrl();
    if (message) {
      setAuthError(message);
    }
  }, []);

  const { filtersOpen, toggleFilters, closeFilters, filters, setFilter } = useFilters();
  const signedIn = user !== null && user !== undefined;
  const { state, summary, query, setQuery, filteredLevels } = useLevels(
    filters,
    user ?? null,
  );

  const loading = state.status === 'loading';
  const error = state.status === 'error' ? state : null;

  return (
    <AppLayout
      progress={<ClanProgress summary={summary} loading={loading} />}
      header={
        <Header
          searchQuery={query}
          onSearchChange={setQuery}
          user={user}
          filtersOpen={filtersOpen}
          onToggleFilters={toggleFilters}
        />
      }
    >
      {authError ? (
        <div class="auth-error-banner" role="alert">
          <p class="auth-error-banner__message">{authError}</p>
          <button
            class="auth-error-banner__dismiss"
            type="button"
            aria-label="Dismiss"
            onClick={() => setAuthError(null)}
          >
            ×
          </button>
        </div>
      ) : null}
      <ContentSplit
        open={filtersOpen}
        stats={user ? <PlayerStatsPanel user={user} /> : null}
        list={
          <LevelList
            levels={filteredLevels}
            loading={loading}
            signedIn={signedIn}
            layoutKey={`${filtersOpen ? 'open' : 'closed'}-${user ? 'in' : 'out'}`}
            error={error}
          />
        }
        panel={
          <FiltersPanel
            id="filters-panel"
            open={filtersOpen}
            signedIn={signedIn}
            filters={filters}
            onFilterChange={setFilter}
            onClose={closeFilters}
          />
        }
      />
    </AppLayout>
  );
}
