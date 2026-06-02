import type { SortMode } from '../../lib/types/sort';

interface SortModeIconProps {
  mode: SortMode;
}

export function SortModeIcon({ mode }: SortModeIconProps) {
  if (mode === 'position') {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path
          d="M5 5h10M5 10h10M5 15h10"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-width="1.8"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle
        cx="10"
        cy="10"
        r="7"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      />
      <path
        d="M10 6v4.2L13 12"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.8"
      />
    </svg>
  );
}
