import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

export function useScrollTop() {
  const [scrollTop, setScrollTop] = useState(0);
  const frameRef = useRef(0);
  const pendingRef = useRef(0);

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const onScroll = useCallback((event: Event) => {
    pendingRef.current = (event.currentTarget as HTMLElement).scrollTop;

    if (frameRef.current) return;

    frameRef.current = requestAnimationFrame(() => {
      setScrollTop(pendingRef.current);
      frameRef.current = 0;
    });
  }, []);

  const resetScroll = useCallback(() => {
    pendingRef.current = 0;
    setScrollTop(0);
  }, []);

  return { scrollTop, onScroll, resetScroll };
}
