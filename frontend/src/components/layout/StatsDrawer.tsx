import type { ComponentChildren } from 'preact';

interface StatsDrawerProps {
  id: string;
  open: boolean;
  onClose: () => void;
  children: ComponentChildren;
}

export function StatsDrawer({ id, open, onClose, children }: StatsDrawerProps) {
  return (
    <aside id={id} class="stats-drawer" aria-hidden={open ? undefined : true}>
      <div class="stats-drawer__header">
        <h2 class="stats-drawer__title">Your stats</h2>
        <button
          class="stats-drawer__close"
          type="button"
          onClick={onClose}
          aria-label="Close stats"
        >
          ×
        </button>
      </div>
      <div class="stats-drawer__body">{children}</div>
    </aside>
  );
}
