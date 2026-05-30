import type { ComponentChildren } from 'preact';

interface ContentSplitProps {
  open: boolean;
  list: ComponentChildren;
  panel: ComponentChildren;
}

export function ContentSplit({ open, list, panel }: ContentSplitProps) {
  return (
    <div class={`content-split${open ? ' content-split--open' : ''}`}>
      <div class="content-split__list">{list}</div>
      {panel}
    </div>
  );
}
