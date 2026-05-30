import type { BoardLevel } from '../../lib/types/board';

interface LevelCardShowcaseProps {
  level: BoardLevel;
}

export function LevelCardShowcase({ level }: LevelCardShowcaseProps) {
  if (!level.showcaseVideoUrl) {
    return <div class="level-card-showcase level-card-showcase--empty" aria-hidden="true" />;
  }

  return (
    <div class="level-card-showcase">
      <a
        class="level-card-showcase__button"
        href={level.showcaseVideoUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Showcase
      </a>
    </div>
  );
}
