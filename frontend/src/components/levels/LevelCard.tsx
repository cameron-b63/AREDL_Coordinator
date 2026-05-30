import type { BoardLevel } from '../../lib/types/board';
import { AssigneeBubble } from './AssigneeBubble';
import { ClaimMenu } from './ClaimMenu';

interface LevelCardProps {
  level: BoardLevel;
  signedIn: boolean;
}

export function LevelCard({ level, signedIn }: LevelCardProps) {
  const completed = level.completion.state === 'completed';
  const username = level.completion.by?.username ?? 'Nobody Yet';
  const avatarUrl = level.completion.by?.avatarUrl ?? null;

  return (
    <article class="level-card">
      <div class="level-card__content">
        <h2 class="level-card__title">
          <span class="level-card__rank">#{level.position}</span>
          <span class="level-card__dash"> - </span>
          <span class="level-card__name">{level.name}</span>
        </h2>
        <AssigneeBubble
          verb="Completed"
          username={username}
          avatarUrl={avatarUrl}
          completed={completed}
        />
      </div>
      <ClaimMenu
        signedIn={signedIn}
        menuEnabled={level.claim.menuEnabled}
        hasActiveClaim={level.claim.active !== null}
      />
    </article>
  );
}
