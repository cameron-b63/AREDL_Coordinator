import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { createCrateSoundController } from '../../lib/crateSounds';
import {
  formatNlwTierLabel,
  resolveCrateSoundTier,
} from '../../lib/levelCrateSoundTier';
import type { BoardLevel } from '../../lib/types/board';

export const CRATE_ITEM_WIDTH = 180;
export const CRATE_ITEM_GAP = 8;
const SCROLL_DURATION_MS = 4000;
const WINNER_PULSE_MS = 600;

interface RandomLevelCrateOverlayProps {
  reel: BoardLevel[];
  winIndex: number;
  soundEnabled: boolean;
  onComplete: () => void;
}

function readStripTranslateX(strip: HTMLElement): number {
  const transform = getComputedStyle(strip).transform;
  if (!transform || transform === 'none') {
    return 0;
  }
  return new DOMMatrixReadOnly(transform).m41;
}

function centeredReelIndex(viewportWidth: number, translateX: number): number {
  const itemStep = CRATE_ITEM_WIDTH + CRATE_ITEM_GAP;
  return Math.round((viewportWidth / 2 - translateX - CRATE_ITEM_WIDTH / 2) / itemStep);
}

/** Approximates cubic-bezier(0.08, 0.82, 0.17, 1) — strong ease-out deceleration. */
function easeOutStrong(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function animateScroll(
  strip: HTMLElement,
  fromX: number,
  toX: number,
  durationMs: number,
  onDone: () => void,
): () => void {
  strip.style.transition = 'none';
  strip.style.transform = `translateX(${fromX}px)`;
  void strip.offsetHeight;

  const startTime = performance.now();
  let rafId = 0;
  let cancelled = false;

  const tick = (now: number) => {
    if (cancelled) {
      return;
    }
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / durationMs);
    const x = fromX + (toX - fromX) * easeOutStrong(t);
    strip.style.transform = `translateX(${x}px)`;
    if (t < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      onDone();
    }
  };

  rafId = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
  };
}

export function RandomLevelCrateOverlay({
  reel,
  winIndex,
  soundEnabled,
  onComplete,
}: RandomLevelCrateOverlayProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [showWinner, setShowWinner] = useState(false);
  const completedRef = useRef(false);
  const finalOffsetRef = useRef(0);
  const trackingRafRef = useRef(0);
  const scrollCancelRef = useRef<(() => void) | null>(null);
  const lastCenteredIndexRef = useRef(-1);
  const soundsRef = useRef(createCrateSoundController());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const stopTracking = useCallback(() => {
    if (trackingRafRef.current) {
      cancelAnimationFrame(trackingRafRef.current);
      trackingRafRef.current = 0;
    }
  }, []);

  const stopScroll = useCallback(() => {
    scrollCancelRef.current?.();
    scrollCancelRef.current = null;
  }, []);

  const finish = useCallback(() => {
    if (completedRef.current) {
      return;
    }
    completedRef.current = true;
    stopScroll();
    stopTracking();
    soundsRef.current.stop();
    onCompleteRef.current();
  }, [stopScroll, stopTracking]);

  const revealWinner = useCallback(() => {
    if (completedRef.current) {
      return;
    }
    stopScroll();
    stopTracking();
    if (soundEnabled) {
      const winner = reel[winIndex];
      if (winner) {
        soundsRef.current.playLand(resolveCrateSoundTier(winner));
      }
    } else {
      soundsRef.current.stop();
    }
    setShowWinner(true);
    window.setTimeout(finish, WINNER_PULSE_MS);
  }, [finish, reel, soundEnabled, stopScroll, stopTracking, winIndex]);

  const snapToFinal = useCallback(() => {
    const strip = stripRef.current;
    if (strip) {
      strip.style.transition = 'none';
      strip.style.transform = `translateX(${finalOffsetRef.current}px)`;
    }
  }, []);

  const skipToEnd = useCallback(() => {
    if (completedRef.current) {
      return;
    }
    stopScroll();
    stopTracking();
    soundsRef.current.stop();
    snapToFinal();
    revealWinner();
  }, [revealWinner, snapToFinal, stopScroll, stopTracking]);

  useEffect(() => {
    completedRef.current = false;
    setShowWinner(false);

    const viewport = viewportRef.current;
    const strip = stripRef.current;
    if (!viewport || !strip) {
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const itemStep = CRATE_ITEM_WIDTH + CRATE_ITEM_GAP;
    const finalOffset = viewport.offsetWidth / 2 - (winIndex * itemStep + CRATE_ITEM_WIDTH / 2);
    finalOffsetRef.current = finalOffset;
    lastCenteredIndexRef.current = -1;

    const trackCrossings = () => {
      if (completedRef.current) {
        return;
      }

      const translateX = readStripTranslateX(strip);
      const index = centeredReelIndex(viewport.offsetWidth, translateX);
      const clamped = Math.max(0, Math.min(reel.length - 1, index));

      if (clamped !== lastCenteredIndexRef.current) {
        lastCenteredIndexRef.current = clamped;
        if (soundEnabled) {
          soundsRef.current.playSpinClick();
        }
      }

      trackingRafRef.current = requestAnimationFrame(trackCrossings);
    };

    const startScroll = (durationMs: number) => {
      scrollCancelRef.current = animateScroll(strip, 0, finalOffset, durationMs, () => {
        scrollCancelRef.current = null;
        revealWinner();
      });
      trackingRafRef.current = requestAnimationFrame(trackCrossings);
    };

    let layoutRaf = 0;
    const layoutRaf2 = requestAnimationFrame(() => {
      layoutRaf = requestAnimationFrame(() => {
        void strip.offsetHeight;
        if (reducedMotion) {
          snapToFinal();
          revealWinner();
          return;
        }
        startScroll(SCROLL_DURATION_MS);
      });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        skipToEnd();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(layoutRaf2);
      cancelAnimationFrame(layoutRaf);
      stopScroll();
      stopTracking();
      window.removeEventListener('keydown', handleKeyDown);
      soundsRef.current.stop();
    };
  }, [
    reel.length,
    revealWinner,
    skipToEnd,
    snapToFinal,
    soundEnabled,
    stopScroll,
    stopTracking,
    winIndex,
  ]);

  return (
    <div
      class="crate-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Random level roll"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          skipToEnd();
        }
      }}
    >
      <div class="crate-overlay__frame">
        <div class="crate-overlay__viewport" ref={viewportRef}>
          <div class="crate-overlay__marker" aria-hidden="true" />
          <div class="crate-overlay__strip" ref={stripRef}>
            {reel.map((level, index) => {
              const soundTier = resolveCrateSoundTier(level);
              return (
                <div
                  key={`${level.id}-${index}`}
                  class={`crate-reel-item${
                    showWinner && index === winIndex ? ' crate-reel-item--winner' : ''
                  }`}
                  data-sound-tier={soundTier}
                >
                  <span class="crate-reel-item__position">#{level.position}</span>
                  <span class="crate-reel-item__nlw-tier">{formatNlwTierLabel(level)}</span>
                  <span class="crate-reel-item__name">{level.name}</span>
                  <span class="crate-reel-item__points">{level.points} pts</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
