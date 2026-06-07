import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { createCrateSoundController } from '../../lib/crateSounds';
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
  const soundsRef = useRef(createCrateSoundController());

  const shouldPlaySound =
    soundEnabled && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const finish = useCallback(() => {
    if (completedRef.current) {
      return;
    }
    completedRef.current = true;
    soundsRef.current.stop();
    onComplete();
  }, [onComplete]);

  const revealWinner = useCallback(() => {
    if (shouldPlaySound) {
      soundsRef.current.playReveal();
    } else {
      soundsRef.current.stop();
    }
    setShowWinner(true);
    window.setTimeout(finish, WINNER_PULSE_MS);
  }, [finish, shouldPlaySound]);

  const skipToEnd = useCallback(() => {
    if (completedRef.current) {
      return;
    }
    soundsRef.current.stop();
    const strip = stripRef.current;
    if (strip) {
      strip.style.transition = 'none';
      strip.style.transform = `translateX(${finalOffsetRef.current}px)`;
    }
    revealWinner();
  }, [revealWinner]);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      finish();
      return;
    }

    const viewport = viewportRef.current;
    const strip = stripRef.current;
    if (!viewport || !strip) {
      return;
    }

    const itemStep = CRATE_ITEM_WIDTH + CRATE_ITEM_GAP;
    const finalOffset = viewport.offsetWidth / 2 - (winIndex * itemStep + CRATE_ITEM_WIDTH / 2);
    finalOffsetRef.current = finalOffset;

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        strip.style.transition = `transform ${SCROLL_DURATION_MS}ms cubic-bezier(0.08, 0.82, 0.17, 1)`;
        strip.style.transform = `translateX(${finalOffset}px)`;
        if (shouldPlaySound) {
          soundsRef.current.playRoll(SCROLL_DURATION_MS);
        }
      });
    });

    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName !== 'transform' || completedRef.current) {
        return;
      }
      revealWinner();
    };

    strip.addEventListener('transitionend', handleTransitionEnd);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        skipToEnd();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      strip.removeEventListener('transitionend', handleTransitionEnd);
      window.removeEventListener('keydown', handleKeyDown);
      soundsRef.current.stop();
    };
  }, [finish, revealWinner, shouldPlaySound, skipToEnd, winIndex]);

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
            {reel.map((level, index) => (
              <div
                key={`${level.id}-${index}`}
                class={`crate-reel-item${
                  showWinner && index === winIndex ? ' crate-reel-item--winner' : ''
                }`}
              >
                <span class="crate-reel-item__position">#{level.position}</span>
                <span class="crate-reel-item__name">{level.name}</span>
                <span class="crate-reel-item__points">{level.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
