import { useState } from 'preact/hooks';
import { copyToClipboard, isFinePointerDevice } from '../../lib/copyToClipboard';
import type { BoardLevel } from '../../lib/types/board';
import { levelIsCompleted } from '../../lib/types/board';
import { AssigneeBubble } from './AssigneeBubble';
import { ClaimMenu } from './ClaimMenu';
import { LevelCardActions } from './LevelCardActions';
import { LevelCardShowcase } from './LevelCardShowcase';

interface LevelCardProps {
  level: BoardLevel;
  signedIn: boolean;
}

export function LevelCard({ level, signedIn }: LevelCardProps) {
  const completed = levelIsCompleted(level);
  const username = level.completion.by?.username ?? 'Nobody Yet';
  const avatarUrl = level.completion.by?.avatarUrl ?? null;
  const [copied, setCopied] = useState(false);

  async function handleCopyId() {
    if (!isFinePointerDevice()) return;
    const ok = await copyToClipboard(String(level.gameLevelId));
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <article class={`level-card${completed ? ' level-card--completed' : ''}`}>
      <div class="level-card__info">
        <h2 class="level-card__title">
          <span class="level-card__rank">#{level.position}</span>
          <span class="level-card__dash"> - </span>
          <span class="level-card__name">{level.name}</span>
          <button
            type="button"
            class="level-card__id"
            title={copied ? 'Copied!' : `Copy level ID ${level.gameLevelId}`}
            onClick={handleCopyId}
          >
            ({level.gameLevelId})
          </button>
        </h2>
        <AssigneeBubble
          verb="Completed"
          username={username}
          avatarUrl={avatarUrl}
          completed={completed}
        />
      </div>
      <LevelCardShowcase level={level} />
      <div class="level-card__aside">
        {completed ? (
          <LevelCardActions level={level} />
        ) : (
          <ClaimMenu
            signedIn={signedIn}
            menuEnabled={level.claim.menuEnabled}
            hasActiveClaim={level.claim.active !== null}
          />
        )}
      </div>
    </article>
  );
}
