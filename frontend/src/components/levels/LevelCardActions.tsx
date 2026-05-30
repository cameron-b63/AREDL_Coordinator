import { ExternalLinkIcon } from '../ui/ExternalLinkIcon';
import type { BoardLevel } from '../../lib/types/board';

interface LevelCardActionsProps {
  level: BoardLevel;
}

export function LevelCardActions({ level }: LevelCardActionsProps) {
  const completionUrl = level.completion.videoUrl;
  const verificationUrl = level.clanVerificationVideoUrl;

  return (
    <div class="level-card-actions">
      {completionUrl ? (
        <a
          class="level-card-actions__button level-card-actions__button--completion"
          href={completionUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>Completion</span>
          <ExternalLinkIcon />
        </a>
      ) : null}
      {verificationUrl ? (
        <a
          class="level-card-actions__link"
          href={verificationUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Verification
        </a>
      ) : null}
    </div>
  );
}
