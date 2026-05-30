import { useEffect, useRef, useState } from 'preact/hooks';
import { useVirtualWindow } from '../../hooks/useVirtualWindow';
import type { Level } from '../../lib/types/level';
import { LevelCard } from './LevelCard';

const ITEM_HEIGHT = 260;
const ITEM_GAP = 20;

interface LevelListProps {
  levels: Level[];
  loading: boolean;
  signedIn: boolean;
  error: { message: string; retry: () => void } | null;
}

export function LevelList({ levels, loading, signedIn, error }: LevelListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    function updateViewport() {
      setViewportHeight(node!.clientHeight);
    }

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    setScrollTop(0);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [levels]);

  const virtualWindow = useVirtualWindow(scrollTop, viewportHeight, {
    itemCount: levels.length,
    itemHeight: ITEM_HEIGHT,
    gap: ITEM_GAP,
    overscan: 3,
  });

  if (loading) {
    return (
      <div class="level-list level-list--state">
        <p class="level-list__message">Loading demon list…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div class="level-list level-list--state">
        <p class="level-list__message level-list__message--error">{error.message}</p>
        <button class="level-list__retry" type="button" onClick={error.retry}>
          Retry
        </button>
      </div>
    );
  }

  if (levels.length === 0) {
    return (
      <div class="level-list level-list--state">
        <p class="level-list__message">No levels match your search.</p>
      </div>
    );
  }

  const visibleLevels = levels.slice(virtualWindow.startIndex, virtualWindow.endIndex);

  return (
    <div
      ref={scrollRef}
      class="level-list"
      onScroll={(event) =>
        setScrollTop((event.currentTarget as HTMLDivElement).scrollTop)
      }
    >
      <div class="level-list__viewport" style={{ height: `${virtualWindow.totalHeight}px` }}>
        <div
          class="level-list__window"
          style={{ transform: `translateY(${virtualWindow.offsetTop}px)` }}
        >
          {visibleLevels.map((level) => (
            <div key={level.id} class="level-list__item">
              <LevelCard level={level} signedIn={signedIn} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
