import { useEffect, useState } from 'preact/hooks';

export function useParallax(containerRef: { current: HTMLElement | null }, factor = 0.15) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frame = 0;

    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        setOffset(container!.scrollTop * factor);
        frame = 0;
      });
    }

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [containerRef, factor]);

  return offset;
}
