import type { ComponentChildren } from 'preact';

interface ContentSplitProps {
  filtersOpen: boolean;
  statsOpen: boolean;
  list: ComponentChildren;
  filtersPanel: ComponentChildren;
  statsPanel: ComponentChildren;
}

export function ContentSplit({
  filtersOpen,
  statsOpen,
  list,
  filtersPanel,
  statsPanel,
}: ContentSplitProps) {
  const panelOpen = filtersOpen || statsOpen;

  return (
    <div
      class={`content-split${panelOpen ? ' content-split--open' : ''}${statsOpen ? ' content-split--stats-open' : ''}${filtersOpen ? ' content-split--filters-open' : ''}`}
    >
      {statsPanel}
      <div class="content-split__list">{list}</div>
      {filtersPanel}
    </div>
  );
}
