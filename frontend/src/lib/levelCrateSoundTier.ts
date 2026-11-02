import { resolveNlwTierSound } from './nlwTierColors.ts';
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

export function resolveCrateSoundTier(level: BoardLevel): CrateSoundTier {
  const nlwSound = resolveNlwTierSound(level.nlwTier);
  if (nlwSound) {
    return nlwSound;
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
