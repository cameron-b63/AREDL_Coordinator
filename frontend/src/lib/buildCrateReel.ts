import type { BoardLevel } from './types/board';

export const DEFAULT_CRATE_WIN_INDEX = 45;
export const DEFAULT_CRATE_REEL_LENGTH = 55;

function pickFromPool(pool: BoardLevel[], avoid?: BoardLevel): BoardLevel {
  if (pool.length === 1) {
    return pool[0]!;
  }
  let candidate = pool[Math.floor(Math.random() * pool.length)]!;
  if (avoid && candidate.id === avoid.id) {
    const alternatives = pool.filter((level) => level.id !== avoid.id);
    candidate = alternatives[Math.floor(Math.random() * alternatives.length)] ?? candidate;
  }
  return candidate;
}

export function buildCrateReel(
  pool: BoardLevel[],
  winner: BoardLevel,
  winIndex = DEFAULT_CRATE_WIN_INDEX,
  totalLength = DEFAULT_CRATE_REEL_LENGTH,
): BoardLevel[] {
  const reel: BoardLevel[] = [];
  for (let index = 0; index < totalLength; index += 1) {
    if (index === winIndex) {
      reel.push(winner);
      continue;
    }
    reel.push(pickFromPool(pool, reel[index - 1]));
  }
  return reel;
}
