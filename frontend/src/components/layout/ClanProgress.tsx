import type { BoardSummary } from '../../lib/types/board';

interface ClanProgressProps {
  summary: BoardSummary | null;
  loading: boolean;
}

export function ClanProgress({ summary, loading }: ClanProgressProps) {
  const completed = summary?.completedCount ?? 0;
  const supposedlyCompleted = summary?.supposedlyCompletedCount ?? 0;
  const total = summary?.totalCount ?? 0;
  const completedRatio = total > 0 ? completed / total : 0;
  const extendedCompleted = Math.min(completed + supposedlyCompleted, total);
  const extendedRatio = total > 0 ? extendedCompleted / total : 0;
  const completedBarPercent = completedRatio * 100;
  const extensionBarPercent = Math.max(0, (extendedRatio - completedRatio) * 100);
  const completedPercent = Math.round(completedRatio * 100);
  const extendedPercent = Math.round(extendedRatio * 100);
  const hasExtendedProgress = supposedlyCompleted > 0;

  return (
    <div class="clan-progress" aria-busy={loading}>
      <div class="clan-progress__track">
        <div
          class="clan-progress__fill"
          style={{ width: loading ? '0%' : `${completedBarPercent}%` }}
        />
        <div
          class="clan-progress__fill clan-progress__fill--extended"
          style={{
            left: loading ? '0%' : `${completedBarPercent}%`,
            width: loading ? '0%' : `${extensionBarPercent}%`,
          }}
          role="progressbar"
          aria-valuenow={extendedCompleted}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Completed plus supposedly completed progress"
        />
      </div>
      <div class="clan-progress__outcrop" aria-live="polite">
        {loading ? (
          <span class="clan-progress__count">…</span>
        ) : (
          <>
            <span class="clan-progress__count">
              {extendedCompleted} / {total}
              <span class="clan-progress__percent">
                {' '}
                {extendedPercent}%
                {hasExtendedProgress ? (
                  <span class="clan-progress__percent-confirmed"> ({completedPercent}%)</span>
                ) : null}
              </span>
            </span>
            <span class="clan-progress__breakdown">
              <span class="clan-progress__breakdown-item">
                <span class="clan-progress__swatch clan-progress__swatch--base" aria-hidden="true" />
                {completed} done
              </span>
              {hasExtendedProgress ? (
                <>
                  <span class="clan-progress__breakdown-sep" aria-hidden="true">
                    ·
                  </span>
                  <span class="clan-progress__breakdown-item">
                    <span
                      class="clan-progress__swatch clan-progress__swatch--extended"
                      aria-hidden="true"
                    />
                    {supposedlyCompleted} supp.
                  </span>
                </>
              ) : null}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
