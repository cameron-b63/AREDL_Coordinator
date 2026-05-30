import type { User } from '../../lib/types/user';

interface PlayerStatsPanelProps {
  user: User;
}

export function PlayerStatsPanel({ user }: PlayerStatsPanelProps) {
  return (
    <aside class="player-stats" aria-label="Your clan contributions">
      <h2 class="player-stats__title">Your stats</h2>
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
      </dl>
    </aside>
  );
}
