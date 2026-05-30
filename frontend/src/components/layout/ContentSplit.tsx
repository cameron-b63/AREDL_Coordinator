import type { ComponentChildren } from 'preact';

interface ContentSplitProps {
  open: boolean;
  stats: ComponentChildren;
  list: ComponentChildren;
  panel: ComponentChildren;
}

export function ContentSplit({ open, stats, list, panel }: ContentSplitProps) {
  return (
    <div class={`content-split${open ? ' content-split--open' : ''}`}>
      {stats}
      <div class="content-split__list">{list}</div>
      {panel}
    </div>
  );
}
