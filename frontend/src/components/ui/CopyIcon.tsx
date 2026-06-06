interface CopyIconProps {
  copied?: boolean;
}

export function CopyIcon({ copied = false }: CopyIconProps) {
  if (copied) {
    return (
      <svg class="level-card__meta-icon" viewBox="0 0 12 12" aria-hidden="true">
        <path
          d="M2 6.5 5 9.5 10 3"
          fill="none"
          stroke="currentColor"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg class="level-card__meta-icon" viewBox="0 0 12 12" aria-hidden="true">
      <rect
        x="4"
        y="4"
        width="7"
        height="7"
        rx="1"
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
      />
      <path
        d="M3 8H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v1"
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
