import { useState } from 'preact/hooks';
import { computeUserTagStats } from '../../lib/tagStats';
import type { BoardLevel } from '../../lib/types/board';
import type { User } from '../../lib/types/user';

interface PlayerStatsPanelProps {
  user: User;
  levels: BoardLevel[];
}

export function PlayerStatsPanel({ user, levels }: PlayerStatsPanelProps) {
  const [includeSupposedlyCompleted, setIncludeSupposedlyCompleted] = useState(false);
  const tagStats = computeUserTagStats(
    levels,
    user,
    includeSupposedlyCompleted,
  );

  return (
    <div class="player-stats" aria-label="Your clan contributions">
      <dl class="player-stats__list">
        <div class="player-stats__row">
          <dt class="player-stats__label">Levels contributed</dt>
          <dd class="player-stats__value">{user.stats.levelsContributed}</dd>
        </div>
        <div class="player-stats__row">
          <dt class="player-stats__label">Points earned</dt>
          <dd class="player-stats__value">
            {user.stats.pointsEarned.toLocaleString()}
          </dd>
        </div>
        <div class="player-stats__row">
          <dt class="player-stats__label">Completed on board</dt>
          <dd class="player-stats__value">{tagStats.completedOnBoard}</dd>
        </div>
        <div class="player-stats__row">
          <dt class="player-stats__label">Points from your completions</dt>
          <dd class="player-stats__value">
            {tagStats.pointsFromCompleted.toLocaleString()}
          </dd>
        </div>
      </dl>

      {tagStats.topTags.length > 0 ? (
        <section class="player-stats__tags">
          <h3 class="player-stats__tags-title">Top tags on your levels</h3>
          <ul class="player-stats__tag-list">
            {tagStats.topTags.map(({ tag, count }) => (
              <li key={tag} class="player-stats__tag-item">
                <span class="player-stats__tag-name">{tag}</span>
                <span class="player-stats__tag-count">{count}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <label class="player-stats__toggle">
        <input
          type="checkbox"
          checked={includeSupposedlyCompleted}
          onChange={(event) =>
            setIncludeSupposedlyCompleted(
              (event.currentTarget as HTMLInputElement).checked,
            )
          }
        />
        <span class="player-stats__toggle-label">
          Include supposedly completed in tag breakdown
        </span>
      </label>
    </div>
  );
}
