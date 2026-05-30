interface FiltersButtonProps {
  active: boolean;
  onClick: () => void;
}

export function FiltersButton({ active, onClick }: FiltersButtonProps) {
  return (
    <button
      class={`filters-button${active ? ' filters-button--active' : ''}`}
      type="button"
      aria-expanded={active}
      aria-controls="filters-panel"
      onClick={onClick}
    >
      Filters
    </button>
  );
}
