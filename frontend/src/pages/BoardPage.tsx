import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { AppLayout } from '../components/layout/AppLayout';
import { ClanProgress } from '../components/layout/ClanProgress';
import { ContentSplit } from '../components/layout/ContentSplit';
import { Header } from '../components/layout/Header';
import { PlayerStatsPanel } from '../components/layout/PlayerStatsPanel';
import { StatsDrawer } from '../components/layout/StatsDrawer';
import { FiltersPanel } from '../components/filters/FiltersPanel';
import { LevelList } from '../components/levels/LevelList';
import { RandomLevelCrateOverlay } from '../components/ui/RandomLevelCrateOverlay';
import type { AuthHandle } from '../hooks/useAuth';
import { useFilters } from '../hooks/useFilters';
import type { UserPreferencesHandle } from '../hooks/useUserPreferences';
import { useLevels } from '../hooks/useLevels';
import { buildCrateReel, DEFAULT_CRATE_WIN_INDEX } from '../lib/buildCrateReel';
import { consumeAuthErrorFromUrl } from '../lib/authError';
import { canPickRandomLevel, pickRandomLevelWithPool } from '../lib/randomLevel';
import { computeUserTagStats } from '../lib/tagStats';
import { filtersAreActive, formatUserSearchQuery } from '../lib/types/filters';
import type { BoardLevel } from '../lib/types/board';
import type { ClaimMutationResponse } from '../lib/types/claimMutation';
import { normalizeUserClaims, normalizeHardest, toActiveClaim } from '../lib/types/claimMutation';

interface CrateRollState {
  winner: BoardLevel;
  reel: BoardLevel[];
  winIndex: number;
}

interface BoardPageProps {
  auth: AuthHandle;
  prefs: UserPreferencesHandle;
}

export function BoardPage({ auth, prefs }: BoardPageProps) {
  const [authError, setAuthError] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [includeSupposedlyCompleted, setIncludeSupposedlyCompleted] = useState(true);
  const [crateRoll, setCrateRoll] = useState<CrateRollState | null>(null);
  const { user, setClaims, patchHardest } = auth;

  useEffect(() => {
    const message = consumeAuthErrorFromUrl();
    if (message) {
      setAuthError(message);
    }
  }, []);

  const { filtersOpen, toggleFilters, closeFilters } = useFilters();
  const {
    filters,
    setFilter,
    sortDirection,
    sortMode,
    toggleSortDirection,
    toggleSortMode,
    resetToDefaults,
    randomLevelCrateAnimation,
    randomLevelCrateSound,
  } = prefs;
  const signedIn = user !== null && user !== undefined;
  const { state, summary, query, setQuery, filteredLevels, patchLevelClaim } = useLevels(
    filters,
    sortMode,
    sortDirection,
    user ?? null,
  );

  const boardLevels = state.status === 'ready' ? state.levels : [];
  const topTagNames = useMemo(() => {
    if (!user || boardLevels.length === 0) return new Set<string>();
    return new Set(
      computeUserTagStats(boardLevels, user, includeSupposedlyCompleted)
        .topTags.map(({ tag }) => tag),
    );
  }, [user, boardLevels, includeSupposedlyCompleted]);
  const positionRange = useMemo(
    () => ({
      positionMin: filters.positionMin,
      positionMax: filters.positionMax,
    }),
    [filters.positionMin, filters.positionMax],
  );
  const randomLevelDisabled =
    state.status !== 'ready' ||
    !canPickRandomLevel(boardLevels, user ?? null, positionRange) ||
    crateRoll !== null;

  const handleRandomLevelPick = useCallback(() => {
    const result = pickRandomLevelWithPool(boardLevels, user ?? null, positionRange);
    if (!result) {
      return;
    }

    const useAnimation =
      randomLevelCrateAnimation &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (useAnimation) {
      setCrateRoll({
        winner: result.winner,
        reel: buildCrateReel(result.pool, result.winner),
        winIndex: DEFAULT_CRATE_WIN_INDEX,
      });
      return;
    }

    setQuery(String(result.winner.gameLevelId));
  }, [boardLevels, positionRange, randomLevelCrateAnimation, setQuery, user]);

  const handleCrateComplete = useCallback(() => {
    setCrateRoll((current) => {
      if (current) {
        setQuery(String(current.winner.gameLevelId));
      }
      return null;
    });
  }, [setQuery]);

  const handleUsernameSearch = useCallback(
    (username: string) => {
      setQuery(formatUserSearchQuery(username));
    },
    [setQuery],
  );

  const toggleStats = useCallback(() => {
    setStatsOpen((open) => {
      if (!open) closeFilters();
      return !open;
    });
  }, [closeFilters]);

  const closeStats = useCallback(() => {
    setStatsOpen(false);
  }, []);

  const handleToggleFilters = useCallback(() => {
    if (!filtersOpen) setStatsOpen(false);
    toggleFilters();
  }, [filtersOpen, toggleFilters]);

  const handleClaimChange = useCallback(
    (result: ClaimMutationResponse) => {
      setClaims(normalizeUserClaims(result.claims));
      patchLevelClaim(result.levelId, toActiveClaim(result.levelActive));
      if (result.hardest !== undefined) {
        patchHardest({
          hardest: normalizeHardest(result.hardest),
          manualHardest:
            result.manualHardest !== undefined
              ? normalizeHardest(result.manualHardest)
              : null,
        });
      }
    },
    [patchHardest, patchLevelClaim, setClaims],
  );

  const loading = state.status === 'loading';
  const error = state.status === 'error' ? state : null;

  return (
    <AppLayout
      header={
        <Header
          searchQuery={query}
          onSearchChange={setQuery}
          randomLevelDisabled={randomLevelDisabled}
          onRandomLevelPick={handleRandomLevelPick}
          user={user}
          filtersOpen={filtersOpen}
          filtersActive={filtersAreActive(filters)}
          onToggleFilters={handleToggleFilters}
          statsOpen={statsOpen}
          onToggleStats={toggleStats}
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
      <div class={`app-main__progress${statsOpen ? ' app-main__progress--stats-open' : ''}`}>
        <ClanProgress summary={summary} loading={loading} />
      </div>
      <ContentSplit
        filtersOpen={filtersOpen}
        statsOpen={statsOpen}
        list={
          <LevelList
            levels={filteredLevels}
            loading={loading}
            signedIn={signedIn}
            user={user ?? null}
            topTagNames={topTagNames}
            layoutKey={`${filtersOpen ? 'open' : 'closed'}-${statsOpen ? 'stats' : 'nostats'}-${user ? 'in' : 'out'}`}
            error={error}
            onClaimChange={handleClaimChange}
            onUsernameSearch={handleUsernameSearch}
          />
        }
        statsPanel={
          user ? (
            <StatsDrawer id="stats-panel" open={statsOpen} onClose={closeStats}>
              <PlayerStatsPanel
                user={user}
                levels={boardLevels}
                includeSupposedlyCompleted={includeSupposedlyCompleted}
                onIncludeSupposedlyCompletedChange={setIncludeSupposedlyCompleted}
              />
            </StatsDrawer>
          ) : null
        }
        filtersPanel={
          <FiltersPanel
            id="filters-panel"
            open={filtersOpen}
            signedIn={signedIn}
            user={user ?? null}
            filters={filters}
            onFilterChange={setFilter}
            sortMode={sortMode}
            onToggleSortMode={toggleSortMode}
            sortDirection={sortDirection}
            onToggleSortDirection={toggleSortDirection}
            onResetFilters={resetToDefaults}
            onClose={closeFilters}
          />
        }
      />
      {crateRoll ? (
        <RandomLevelCrateOverlay
          reel={crateRoll.reel}
          winIndex={crateRoll.winIndex}
          soundEnabled={randomLevelCrateSound}
          onComplete={handleCrateComplete}
        />
      ) : null}
    </AppLayout>
  );
}
