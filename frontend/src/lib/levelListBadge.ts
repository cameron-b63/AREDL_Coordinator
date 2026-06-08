import { formatNlwTierLabel } from './levelCrateSoundTier';
import { nlwTierPillVars } from './nlwTierColors';
import type { BoardLevel } from './types/board';

export type LevelListBadgeKind = 'main' | 'extended' | 'nlw';

export interface LevelListBadge {
  kind: LevelListBadgeKind;
  label: string;
  pillVars: Record<string, string>;
}

const MAIN_LIST_PILL_VARS = { '--nlw-tier-color': 'var(--color-accent)' };
const EXTENDED_LIST_PILL_VARS = { '--nlw-tier-color': 'var(--color-progress-extended)' };

export function resolveLevelListBadge(level: BoardLevel): LevelListBadge | null {
  if (level.position <= 75) {
    return {
      kind: 'main',
      label: 'MAIN LIST',
      pillVars: MAIN_LIST_PILL_VARS,
    };
  }

  if (level.position <= 150) {
    return {
      kind: 'extended',
      label: 'EXTENDED LIST',
      pillVars: EXTENDED_LIST_PILL_VARS,
    };
  }

  const nlwLabel = formatNlwTierLabel(level);
  if (nlwLabel === '—') {
    return null;
  }

  const pillVars = nlwTierPillVars(level.nlwTier);
  if (!pillVars) {
    return null;
  }

  return {
    kind: 'nlw',
    label: nlwLabel,
    pillVars,
  };
}
