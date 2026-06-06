import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useScrollTop } from '../../hooks/useScrollTop';
import { computeVirtualWindow } from '../../hooks/useVirtualWindow';
import type { BoardLevel } from '../../lib/types/board';
import type { ClaimMutationResponse } from '../../lib/types/claimMutation';
import type { User } from '../../lib/types/user';
import { LevelCard } from './LevelCard';

export const LEVEL_ROW_HEIGHT = 172;
export const LEVEL_ROW_HEIGHT_STACKED = 280;
export const LEVEL_ROW_GAP = 16;
export const LEVEL_ROW_STRIDE = LEVEL_ROW_HEIGHT + LEVEL_ROW_GAP;
export const LEVEL_ROW_STRIDE_STACKED = LEVEL_ROW_HEIGHT_STACKED + LEVEL_ROW_GAP;
export const LEVEL_STACK_BREAKPOINT = 960;

interface LevelListProps {
  levels: BoardLevel[];
  loading: boolean;
  signedIn: boolean;
  user: User | null;
  layoutKey: string;
  error: { message: string; retry: () => void } | null;
  onClaimChange: (result: ClaimMutationResponse) => void;
  onUsernameSearch?: (username: string) => void;
}

export function LevelList({
  levels,
  loading,
  signedIn,
  user,
  layoutKey,
  error,
  onClaimChange,
  onUsernameSearch,
}: LevelListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollTop, onScroll, resetScroll } = useScrollTop();
  const [viewportHeight, setViewportHeight] = useState(0);
  const [stackedLayout, setStackedLayout] = useState(false);

  const rowHeight = stackedLayout ? LEVEL_ROW_HEIGHT_STACKED : LEVEL_ROW_HEIGHT;
  const rowGap = LEVEL_ROW_GAP;
  const rowStride = stackedLayout ? LEVEL_ROW_STRIDE_STACKED : LEVEL_ROW_STRIDE;

  /** Identity of the visible list — claim updates keep the same ids/order. */
  const levelOrderKey = useMemo(
    () => levels.map((level) => level.id).join('\0'),
    [levels],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${LEVEL_STACK_BREAKPOINT}px)`);

    function updateStackedLayout() {
      setStackedLayout(mediaQuery.matches);
    }

    updateStackedLayout();
    mediaQuery.addEventListener('change', updateStackedLayout);

    return () => {
      mediaQuery.removeEventListener('change', updateStackedLayout);
    };
  }, []);

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
  }, [levelOrderKey, resetScroll, stackedLayout]);

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
    itemHeight: rowHeight,
    gap: rowGap,
    overscan: 3,
  });

  const visibleLevels = levels.slice(virtualWindow.startIndex, virtualWindow.endIndex);

  return (
    <div
      ref={scrollRef}
      class="level-list"
      style={{
        '--level-row-height': `${rowHeight}px`,
        '--level-row-gap': `${rowGap}px`,
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
              style={{ top: `${rowIndex * rowStride}px` }}
            >
              <LevelCard
                level={level}
                user={user}
                signedIn={signedIn}
                onClaimChange={onClaimChange}
                onUsernameSearch={onUsernameSearch}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
