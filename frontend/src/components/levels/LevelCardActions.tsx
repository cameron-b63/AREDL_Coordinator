import type { BoardLevel } from '../../lib/types/board';
import { levelIsCompleted } from '../../lib/types/board';

interface LevelCardActionsProps {
  level: BoardLevel;
}

export function LevelCardActions({ level }: LevelCardActionsProps) {
  const completed = levelIsCompleted(level);
  const completionUrl = level.completion.videoUrl;

  return (
    <div class="level-card-actions">
      <a
        class="level-card-actions__button"
        href={level.verificationUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Verification
      </a>
      {completed && completionUrl ? (
        <a
          class="level-card-actions__button level-card-actions__button--completion"
          href={completionUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Completion
        </a>
      ) : null}
    </div>
  );
}
