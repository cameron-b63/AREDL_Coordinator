import { ExternalLinkIcon } from '../ui/ExternalLinkIcon';
import type { BoardLevel } from '../../lib/types/board';

interface LevelCardActionsProps {
  level: BoardLevel;
}

export function LevelCardActions({ level }: LevelCardActionsProps) {
  const videoUrl = level.completion.videoUrl;
  const isVerification = level.completion.isVerification === true;
  const secondaryVerificationUrl = level.clanVerificationVideoUrl;

  return (
    <div class="level-card-actions">
      {videoUrl ? (
        <a
          class={`level-card-actions__button level-card-actions__button--${
            isVerification ? 'verification' : 'completion'
          }`}
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>{isVerification ? 'Verification' : 'Completion'}</span>
          <ExternalLinkIcon />
        </a>
      ) : null}
      {secondaryVerificationUrl ? (
        <a
          class="level-card-actions__link"
          href={secondaryVerificationUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Verification
        </a>
      ) : null}
    </div>
  );
}
