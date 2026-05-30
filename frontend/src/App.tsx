import { AppLayout } from './components/layout/AppLayout';
import { Header } from './components/layout/Header';
import { LevelList } from './components/levels/LevelList';
import { useAuth } from './hooks/useAuth';
import { useLevels } from './hooks/useLevels';

export function App() {
  const { user } = useAuth();
  const { state, query, setQuery, filteredLevels } = useLevels();

  const loading = state.status === 'loading';
  const error = state.status === 'error' ? state : null;

  return (
    <AppLayout
      header={
        <Header
          searchQuery={query}
          onSearchChange={setQuery}
          user={user}
        />
      }
    >
      <LevelList levels={filteredLevels} loading={loading} error={error} />
    </AppLayout>
  );
}
