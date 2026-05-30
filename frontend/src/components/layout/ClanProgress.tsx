import type { BoardSummary } from '../../lib/types/board';

interface ClanProgressProps {
  summary: BoardSummary | null;
  loading: boolean;
}

export function ClanProgress({ summary, loading }: ClanProgressProps) {
  const completed = summary?.completedCount ?? 0;
  const total = summary?.totalCount ?? 0;
  const ratio = total > 0 ? completed / total : 0;
  const percent = Math.round(ratio * 100);

  return (
    <div class="clan-progress" aria-busy={loading}>
      <div class="clan-progress__track">
        <div
          class="clan-progress__fill"
          style={{ width: loading ? '0%' : `${percent}%` }}
          role="progressbar"
          aria-valuenow={completed}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Clan AREDL completion"
        />
      </div>
      <div class="clan-progress__outcrop" aria-live="polite">
        {loading ? (
          <span class="clan-progress__count">…</span>
        ) : (
          <>
            <span class="clan-progress__count">
              {completed} / {total}
            </span>
            <span class="clan-progress__percent">{percent}%</span>
          </>
        )}
      </div>
    </div>
  );
}
