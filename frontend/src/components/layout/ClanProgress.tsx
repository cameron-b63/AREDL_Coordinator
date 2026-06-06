import type { BoardSummary } from '../../lib/types/board';
import { useState } from 'preact/hooks';

interface ClanProgressProps {
  summary: BoardSummary | null;
  loading: boolean;
}

export function ClanProgress({ summary, loading }: ClanProgressProps) {
  const [showExtended, setShowExtended] = useState(true);
  const completed = summary?.completedCount ?? 0;
  const supposedlyCompleted = summary?.supposedlyCompletedCount ?? 0;
  const total = summary?.totalCount ?? 0;
  const completedRatio = total > 0 ? completed / total : 0;
  const extendedCompleted = Math.min(completed + supposedlyCompleted, total);
  const extendedRatio = total > 0 ? extendedCompleted / total : 0;
  const completedPercent = Math.round(completedRatio * 100);
  const extendedPercent = Math.round(extendedRatio * 100);
  const extensionPercent = Math.max(0, extendedPercent - completedPercent);
  const displayedCount = showExtended ? extendedCompleted : completed;
  const displayedPercent = showExtended ? extendedPercent : completedPercent;
  const displayedLabel = showExtended
    ? 'Completed plus supposedly completed'
    : 'Completed';
  const hasExtendedProgress = supposedlyCompleted > 0;

  return (
    <div class="clan-progress" aria-busy={loading}>
      <div class="clan-progress__track">
        <div
          class="clan-progress__fill"
          style={{ width: loading ? '0%' : `${completedPercent}%` }}
        />
        <div
          class="clan-progress__fill clan-progress__fill--extended"
          style={{
            left: loading ? '0%' : `${completedPercent}%`,
            width: loading ? '0%' : `${extensionPercent}%`,
          }}
          role="progressbar"
          aria-valuenow={displayedCount}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`${displayedLabel} progress`}
        />
      </div>
      <div class="clan-progress__outcrop" aria-live="polite">
        {loading ? (
          <span class="clan-progress__count">…</span>
        ) : (
          <>
            <span class="clan-progress__count">
              <button
                type="button"
                class={`clan-progress__toggle ${
                  showExtended ? 'clan-progress__toggle--extended' : 'clan-progress__toggle--base'
                }`}
                onClick={() => setShowExtended((previous) => !previous)}
                aria-pressed={showExtended}
                aria-label={`Toggle progress display. Currently showing ${displayedLabel.toLowerCase()}.`}
                disabled={!hasExtendedProgress}
              >
                {displayedCount}
              </button>{' '}
              / {total}
            </span>
            <span class="clan-progress__percent">{displayedPercent}%</span>
            {hasExtendedProgress ? (
              <span class="clan-progress__legend" aria-hidden="true">
                <span class="clan-progress__legend-item">
                  <span class="clan-progress__legend-swatch clan-progress__legend-swatch--base" />
                  Done
                </span>
                <span class="clan-progress__legend-item">
                  <span class="clan-progress__legend-swatch clan-progress__legend-swatch--extended" />
                  Supp.
                </span>
              </span>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
