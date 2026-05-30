import { defaultAssignment, formatStatusLine } from '../../lib/types/claim';
import { formatLevelTitle, type Level } from '../../lib/types/level';
import { ClaimMenu } from './ClaimMenu';

interface LevelCardProps {
  level: Level;
  signedIn: boolean;
}

export function LevelCard({ level, signedIn }: LevelCardProps) {
  const statusLine = formatStatusLine(defaultAssignment());

  return (
    <article class="level-card">
      <div class="level-card__content">
        <h2 class="level-card__title">{formatLevelTitle(level)}</h2>
        <p class="level-card__status">{statusLine}</p>
      </div>
      <ClaimMenu signedIn={signedIn} />
    </article>
  );
}
