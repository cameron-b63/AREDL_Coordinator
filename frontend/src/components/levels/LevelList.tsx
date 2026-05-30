import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useScrollTop } from '../../hooks/useScrollTop';
import { computeVirtualWindow } from '../../hooks/useVirtualWindow';
import type { BoardLevel } from '../../lib/types/board';
import type { ClaimMutationResponse } from '../../lib/types/claimMutation';
import type { User } from '../../lib/types/user';
import { LevelCard } from './LevelCard';

export const LEVEL_ROW_HEIGHT = 172;
export const LEVEL_ROW_GAP = 16;
export const LEVEL_ROW_STRIDE = LEVEL_ROW_HEIGHT + LEVEL_ROW_GAP;

interface LevelListProps {
  levels: BoardLevel[];
  loading: boolean;
  signedIn: boolean;
  user: User | null;
  layoutKey: string;
  error: { message: string; retry: () => void } | null;
  onClaimChange: (result: ClaimMutationResponse) => void;
}

export function LevelList({
  levels,
  loading,
  signedIn,
  user,
  layoutKey,
  error,
  onClaimChange,
}: LevelListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollTop, onScroll, resetScroll } = useScrollTop();
  const [viewportHeight, setViewportHeight] = useState(0);

  /** Identity of the visible list — claim updates keep the same ids/order. */
  const levelOrderKey = useMemo(
    () => levels.map((level) => level.id).join('\0'),
    [levels],
  );

  useEffect(() => {
    if (loading) return;

    const node = scrollRef.current;
    if (!node) return;

    function updateViewport() {
      setViewportHeight(node!.clientHeight);
    }

    updateViewport();

    const observer = new ResizeObserver(updateViewport);
    observer.observe(node);
    window.addEventListener('resize', updateViewport);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateViewport);
    };
  }, [loading, layoutKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    resetScroll();
  }, [levelOrderKey, resetScroll]);

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

  const virtualWindow = computeVirtualWindow(scrollTop, viewportHeight, {
    itemCount: levels.length,
    itemHeight: LEVEL_ROW_HEIGHT,
    gap: LEVEL_ROW_GAP,
    overscan: 3,
  });

  const visibleLevels = levels.slice(virtualWindow.startIndex, virtualWindow.endIndex);

  return (
    <div
      ref={scrollRef}
      class="level-list"
      style={{
        '--level-row-height': `${LEVEL_ROW_HEIGHT}px`,
        '--level-row-gap': `${LEVEL_ROW_GAP}px`,
      }}
      onScroll={onScroll}
    >
      <div class="level-list__viewport" style={{ height: `${virtualWindow.totalHeight}px` }}>
        {visibleLevels.map((level, index) => {
          const rowIndex = virtualWindow.startIndex + index;
          return (
            <div
              key={level.id}
              class="level-list__item"
              style={{ top: `${rowIndex * LEVEL_ROW_STRIDE}px` }}
            >
              <LevelCard
                level={level}
                user={user}
                signedIn={signedIn}
                onClaimChange={onClaimChange}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
