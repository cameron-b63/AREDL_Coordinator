import { SortDirectionIcon } from '../ui/SortDirectionIcon';
import { SortModeIcon } from '../ui/SortModeIcon';
import { CLAIM_OPTIONS } from '../../lib/types/claim';
import {
  toggleBoardClaimKind,
  type LevelFilters,
} from '../../lib/types/filters';
import type { ClaimKind } from '../../lib/types/claim';
import type { SortDirection, SortMode } from '../../lib/types/sort';
import type { User } from '../../lib/types/user';

interface FiltersPanelProps {
  id: string;
  open: boolean;
  signedIn: boolean;
  user: User | null;
  filters: LevelFilters;
  onFilterChange: <K extends keyof LevelFilters>(key: K, value: LevelFilters[K]) => void;
  sortDirection: SortDirection;
  sortMode: SortMode;
  onToggleSortMode: () => void;
  onToggleSortDirection: () => void;
  onResetFilters: () => void;
  onClose: () => void;
}

function settingsPath(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/settings`;
}

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function FiltersPanel({
  id,
  open,
  signedIn,
  user,
  filters,
  onFilterChange,
  sortDirection,
  sortMode,
  onToggleSortMode,
  onToggleSortDirection,
  onResetFilters,
  onClose,
}: FiltersPanelProps) {
  const myFiltersDisabled = !signedIn;
  const hardest = user?.hardest ?? null;
  const manualHardest = user?.manualHardest ?? null;
  const excludeHardestsDisabled = myFiltersDisabled || hardest?.position == null;

  function handleBoardClaimToggle(kind: ClaimKind, checked: boolean) {
    const next = checked
      ? toggleBoardClaimKind(filters.boardClaimKinds, kind)
      : filters.boardClaimKinds.filter((value) => value !== kind);
    onFilterChange('boardClaimKinds', next);
  }

  const sortModeLabel =
    sortMode === 'position' ? 'Sort by list position (#)' : 'Sort by accepted record date';
  const sortDirectionLabel =
    sortMode === 'position'
      ? sortDirection === 'asc'
        ? 'Position ascending (hardest first)'
        : 'Position descending (easiest first)'
      : sortDirection === 'asc'
        ? 'Record date ascending (most recently accepted first)'
        : 'Record date descending (oldest accepted first)';

  return (
    <aside id={id} class="filters-panel" aria-hidden={open ? undefined : true}>
      <div class="filters-panel__header">
        <h2 class="filters-panel__title">Filters</h2>
        <div class="filters-panel__header-actions">
          <button
            class="filters-panel__icon-btn"
            type="button"
            onClick={onToggleSortMode}
            aria-pressed={sortMode === 'record_date'}
            aria-label={sortModeLabel}
            title={sortModeLabel}
          >
            <SortModeIcon mode={sortMode} />
          </button>
          <button
            class="filters-panel__icon-btn"
            type="button"
            onClick={onToggleSortDirection}
            aria-pressed={sortDirection === 'desc'}
            aria-label={sortDirectionLabel}
            title={sortDirectionLabel}
          >
            <SortDirectionIcon direction={sortDirection} />
          </button>
          <button
            class="filters-panel__icon-btn"
            type="button"
            onClick={onClose}
            aria-label="Close filters"
          >
            ×
          </button>
        </div>
      </div>

      <div class="filters-panel__body">
        <section class="filters-panel__section">
          <h3 class="filters-panel__section-title">Progress</h3>
          <label class="filters-panel__option">
            <input
              type="checkbox"
              checked={filters.excludeCompleted}
              onChange={(event) =>
                onFilterChange(
                  'excludeCompleted',
                  (event.currentTarget as HTMLInputElement).checked,
                )
              }
            />
            <span class="filters-panel__option-label">Exclude completed levels</span>
          </label>
          <label class="filters-panel__option">
            <input
              type="checkbox"
              checked={filters.excludeNewHardests}
              disabled={excludeHardestsDisabled}
              onChange={(event) =>
                onFilterChange(
                  'excludeNewHardests',
                  (event.currentTarget as HTMLInputElement).checked,
                )
              }
            />
            <span class="filters-panel__option-label">Exclude New Hardests</span>
          </label>
          {myFiltersDisabled ? (
            <p class="filters-panel__hint">Sign in to filter by your progress.</p>
          ) : hardest?.position != null ? (
            <p class="filters-panel__hint">
              Hides levels harder than #{hardest.position} {hardest.levelName ?? ''}
              {manualHardest ? ' (manual)' : ''}
            </p>
          ) : (
            <p class="filters-panel__hint">
              Set your hardest in <a href={settingsPath()}>Settings</a>, mark a level{' '}
              <strong>Supposedly Completed</strong>, or complete a level on AREDL.
            </p>
          )}
        </section>

        <section class="filters-panel__section">
          <h3 class="filters-panel__section-title">My levels</h3>
          {myFiltersDisabled ? (
            <p class="filters-panel__hint">Sign in to filter by your activity.</p>
          ) : null}
          <label class="filters-panel__option">
            <input
              type="checkbox"
              checked={filters.onlyMyCompletions}
              disabled={myFiltersDisabled}
              onChange={(event) =>
                onFilterChange(
                  'onlyMyCompletions',
                  (event.currentTarget as HTMLInputElement).checked,
                )
              }
            />
            <span class="filters-panel__option-label">Only levels I completed</span>
          </label>
        </section>

        <section class="filters-panel__section">
          <h3 class="filters-panel__section-title">Claims</h3>
          <label class="filters-panel__option">
            <input
              type="checkbox"
              checked={filters.onlyUnclaimed}
              disabled={myFiltersDisabled}
              onChange={(event) =>
                onFilterChange(
                  'onlyUnclaimed',
                  (event.currentTarget as HTMLInputElement).checked,
                )
              }
            />
            <span class="filters-panel__option-label">Only unclaimed (not completed)</span>
          </label>
          {myFiltersDisabled ? (
            <p class="filters-panel__hint">Sign in for personal claim filters.</p>
          ) : (
            <label class="filters-panel__option">
              <input
                type="checkbox"
                checked={filters.onlyMine}
                disabled={myFiltersDisabled}
                onChange={(event) =>
                  onFilterChange(
                    'onlyMine',
                    (event.currentTarget as HTMLInputElement).checked,
                  )
                }
              />
              <span class="filters-panel__option-label">Claimed by me</span>
            </label>
          )}
          <fieldset class="filters-panel__fieldset">
            <legend class="filters-panel__field-label">Active claim on board (any user)</legend>
            {CLAIM_OPTIONS.map((option) => (
              <label key={option.value} class="filters-panel__option">
                <input
                  type="checkbox"
                  checked={filters.boardClaimKinds.includes(option.value)}
                  onChange={(event) =>
                    handleBoardClaimToggle(
                      option.value,
                      (event.currentTarget as HTMLInputElement).checked,
                    )
                  }
                />
                <span class="filters-panel__option-label">{option.label}</span>
              </label>
            ))}
          </fieldset>
        </section>

        <section class="filters-panel__section">
          <h3 class="filters-panel__section-title">Rank range</h3>
          <div class="filters-panel__range">
            <label class="filters-panel__field">
              <span class="filters-panel__field-label">From #</span>
              <input
                class="filters-panel__input"
                type="number"
                min={1}
                placeholder="1"
                value={filters.positionMin ?? ''}
                onInput={(event) =>
                  onFilterChange(
                    'positionMin',
                    parseOptionalInt((event.currentTarget as HTMLInputElement).value),
                  )
                }
              />
            </label>
            <label class="filters-panel__field">
              <span class="filters-panel__field-label">To #</span>
              <input
                class="filters-panel__input"
                type="number"
                min={1}
                placeholder="1451"
                value={filters.positionMax ?? ''}
                onInput={(event) =>
                  onFilterChange(
                    'positionMax',
                    parseOptionalInt((event.currentTarget as HTMLInputElement).value),
                  )
                }
              />
            </label>
          </div>
        </section>

        {signedIn ? (
          <footer class="filters-panel__footer">
            <button
              type="button"
              class="filters-panel__reset"
              onClick={onResetFilters}
            >
              Reset filters to defaults
            </button>
          </footer>
        ) : null}
      </div>
    </aside>
  );
}
