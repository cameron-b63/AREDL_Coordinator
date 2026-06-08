import type { BoardLevel } from './types/board';

export type CrateSoundTier =
  | 'neutral'
  | 'easy'
  | 'hard'
  | 'extreme'
  | 'lethal'
  | 'apex150'
  | 'apex75'
  | 'apex10';

const EASY_TIERS = new Set(['Beginner', 'Easy', 'Medium']);
const HARD_TIERS = new Set(['Hard', 'Very Hard', 'Insane']);
const EXTREME_TIERS = new Set(['Extreme', 'Remorseless', 'Relentless']);
const LETHAL_TIERS = new Set([
  'Terrifying',
  'Catastrophic',
  'Inexorable',
  'Excruciating',
  'Fuck',
]);

export function resolveCrateSoundTier(level: BoardLevel): CrateSoundTier {
  const nlwTier = level.nlwTier?.trim();
  if (nlwTier) {
    if (EASY_TIERS.has(nlwTier)) {
      return 'easy';
    }
    if (HARD_TIERS.has(nlwTier)) {
      return 'hard';
    }
    if (EXTREME_TIERS.has(nlwTier)) {
      return 'extreme';
    }
    if (LETHAL_TIERS.has(nlwTier)) {
      return 'lethal';
    }
    return 'neutral';
  }

  if (level.position <= 10) {
    return 'apex10';
  }
  if (level.position <= 75) {
    return 'apex75';
  }
  if (level.position <= 150) {
    return 'apex150';
  }
  return 'neutral';
}

export function formatNlwTierLabel(level: BoardLevel): string {
  const nlwTier = level.nlwTier?.trim();
  if (nlwTier) {
    return nlwTier;
  }
  return '—';
}
