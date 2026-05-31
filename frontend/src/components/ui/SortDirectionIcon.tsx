import type { SortDirection } from '../../lib/types/sort';

interface SortDirectionIconProps {
  direction: SortDirection;
}

export function SortDirectionIcon({ direction }: SortDirectionIconProps) {
  if (direction === 'asc') {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M10 4v12M10 16l-4-4M10 16l4-4"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 16V4M10 4l-4 4M10 4l4 4"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
