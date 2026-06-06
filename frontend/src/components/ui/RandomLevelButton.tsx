interface RandomLevelButtonProps {
  disabled: boolean;
  onPick: () => void;
}

export function RandomLevelButton({ disabled, onPick }: RandomLevelButtonProps) {
  return (
    <button
      class="random-level-button"
      type="button"
      aria-label="Pick a random level"
      disabled={disabled}
      onClick={onPick}
    >
      <span class="random-level-button__icon" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none">
          <rect
            x="3.5"
            y="3.5"
            width="13"
            height="13"
            rx="2"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <circle cx="7" cy="7" r="1" fill="currentColor" />
          <circle cx="13" cy="7" r="1" fill="currentColor" />
          <circle cx="10" cy="10" r="1" fill="currentColor" />
          <circle cx="7" cy="13" r="1" fill="currentColor" />
          <circle cx="13" cy="13" r="1" fill="currentColor" />
        </svg>
      </span>
    </button>
  );
}
