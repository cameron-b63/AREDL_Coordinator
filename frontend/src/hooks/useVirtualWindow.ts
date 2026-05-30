export interface VirtualWindow {
  startIndex: number;
  endIndex: number;
  offsetTop: number;
  totalHeight: number;
}

export interface VirtualWindowOptions {
  itemCount: number;
  itemHeight: number;
  gap: number;
  overscan?: number;
}

export function computeVirtualWindow(
  scrollTop: number,
  viewportHeight: number,
  { itemCount, itemHeight, gap, overscan = 2 }: VirtualWindowOptions,
): VirtualWindow {
  if (itemCount === 0) {
    return { startIndex: 0, endIndex: 0, offsetTop: 0, totalHeight: 0 };
  }

  const stride = itemHeight + gap;
  const effectiveViewport = Math.max(viewportHeight, itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / stride) - overscan);
  const visibleCount = Math.ceil(effectiveViewport / stride) + overscan * 2;
  const endIndex = Math.min(itemCount, startIndex + visibleCount);

  return {
    startIndex,
    endIndex,
    offsetTop: startIndex * stride,
    totalHeight: itemCount * stride - gap,
  };
}
