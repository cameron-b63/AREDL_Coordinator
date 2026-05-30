import { CLAIM_OPTIONS } from '../../lib/types/claim';
import type { ClaimFilter, LevelFilters } from '../../lib/types/filters';

interface FiltersPanelProps {
  id: string;
  open: boolean;
  signedIn: boolean;
  filters: LevelFilters;
  onFilterChange: <K extends keyof LevelFilters>(key: K, value: LevelFilters[K]) => void;
  onClose: () => void;
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
  filters,
  onFilterChange,
  onClose,
}: FiltersPanelProps) {
  const myFiltersDisabled = !signedIn;

  return (
    <aside id={id} class="filters-panel" aria-hidden={open ? undefined : true}>
      <div class="filters-panel__header">
        <h2 class="filters-panel__title">Filters</h2>
        <button
          class="filters-panel__close"
          type="button"
          onClick={onClose}
          aria-label="Close filters"
        >
          ×
        </button>
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
          {myFiltersDisabled ? (
            <p class="filters-panel__hint">Sign in to filter by claims.</p>
          ) : null}
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
          <label class="filters-panel__field">
            <span class="filters-panel__field-label">Claim status</span>
            <select
              class="filters-panel__select"
              value={filters.claimFilter}
              disabled={myFiltersDisabled}
              onChange={(event) =>
                onFilterChange(
                  'claimFilter',
                  (event.currentTarget as HTMLSelectElement).value as ClaimFilter,
                )
              }
            >
              <option value="any">Any</option>
              <option value="mine">Claimed by me</option>
              {CLAIM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
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
      </div>
    </aside>
  );
}
