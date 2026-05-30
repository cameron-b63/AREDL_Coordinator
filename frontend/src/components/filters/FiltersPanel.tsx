import type { LevelFilters } from '../../lib/types/filters';

interface FiltersPanelProps {
  id: string;
  open: boolean;
  filters: LevelFilters;
  onFilterChange: <K extends keyof LevelFilters>(key: K, value: LevelFilters[K]) => void;
  onClose: () => void;
}

export function FiltersPanel({
  id,
  open,
  filters,
  onFilterChange,
  onClose,
}: FiltersPanelProps) {
  return (
    <aside
      id={id}
      class="filters-panel"
      aria-hidden={open ? undefined : true}
    >
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
          <span class="filters-panel__option-label">Exclude Completed Levels</span>
        </label>
      </div>
    </aside>
  );
}
