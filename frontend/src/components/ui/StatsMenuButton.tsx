interface StatsMenuButtonProps {
  active: boolean;
  onClick: () => void;
}

export function StatsMenuButton({ active, onClick }: StatsMenuButtonProps) {
  return (
    <button
      class={`stats-menu-button${active ? ' stats-menu-button--active' : ''}`}
      type="button"
      aria-expanded={active}
      aria-controls="stats-panel"
      onClick={onClick}
    >
      <span class="stats-menu-button__icon" aria-hidden="true">
        <span class="stats-menu-button__bar" />
        <span class="stats-menu-button__bar" />
        <span class="stats-menu-button__bar" />
      </span>
      <span class="stats-menu-button__label">Stats</span>
    </button>
  );
}
