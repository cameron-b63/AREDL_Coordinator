export interface Level {
  id: string;
  position: number;
  name: string;
}

export function formatLevelTitle(level: Level): string {
  return `#${level.position} - ${level.name}`;
}
