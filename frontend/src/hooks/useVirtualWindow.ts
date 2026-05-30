import { useEffect, useState } from 'preact/hooks';

export interface VirtualWindow {
  startIndex: number;
  endIndex: number;
  offsetTop: number;
  totalHeight: number;
}

interface VirtualWindowOptions {
  itemCount: number;
  itemHeight: number;
  gap: number;
  overscan?: number;
}

export function useVirtualWindow(
  scrollTop: number,
  viewportHeight: number,
  { itemCount, itemHeight, gap, overscan = 2 }: VirtualWindowOptions,
): VirtualWindow {
  const [windowState, setWindowState] = useState<VirtualWindow>({
    startIndex: 0,
    endIndex: 0,
    offsetTop: 0,
    totalHeight: 0,
  });

  useEffect(() => {
    if (itemCount === 0) {
      setWindowState({ startIndex: 0, endIndex: 0, offsetTop: 0, totalHeight: 0 });
      return;
    }

    const stride = itemHeight + gap;
    const startIndex = Math.max(0, Math.floor(scrollTop / stride) - overscan);
    const visibleCount = Math.ceil(viewportHeight / stride) + overscan * 2;
    const endIndex = Math.min(itemCount, startIndex + visibleCount);

    setWindowState({
      startIndex,
      endIndex,
      offsetTop: startIndex * stride,
      totalHeight: itemCount * stride - gap,
    });
  }, [scrollTop, viewportHeight, itemCount, itemHeight, gap, overscan]);

  return windowState;
}
