import { useEffect, useState } from 'preact/hooks';
import { AppLayout } from './components/layout/AppLayout';
import { ContentSplit } from './components/layout/ContentSplit';
import { Header } from './components/layout/Header';
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
  const { state, query, setQuery, filteredLevels } = useLevels(filters);

  const loading = state.status === 'loading';
  const error = state.status === 'error' ? state : null;

  return (
    <AppLayout
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
        list={
          <LevelList
            levels={filteredLevels}
            loading={loading}
            signedIn={user !== null && user !== undefined}
            layoutKey={filtersOpen ? 'open' : 'closed'}
            error={error}
          />
        }
        panel={
          <FiltersPanel
            id="filters-panel"
            open={filtersOpen}
            filters={filters}
            onFilterChange={setFilter}
            onClose={closeFilters}
          />
        }
      />
    </AppLayout>
  );
}
