import { AppLayout } from './components/layout/AppLayout';
import { ContentSplit } from './components/layout/ContentSplit';
import { Header } from './components/layout/Header';
import { FiltersPanel } from './components/filters/FiltersPanel';
import { LevelList } from './components/levels/LevelList';
import { useAuth } from './hooks/useAuth';
import { useFilters } from './hooks/useFilters';
import { useLevels } from './hooks/useLevels';

export function App() {
  const { user } = useAuth();
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
