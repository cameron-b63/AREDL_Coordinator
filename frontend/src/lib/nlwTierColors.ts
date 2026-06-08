/**
 * NLW spreadsheet tier colors (Non-Listworthy Extreme Demons).
 * Source: nlw-integration ListManager::getTierColor + namu wiki tier table.
 */
export const NLW_TIER_COLORS: Readonly<Record<string, string>> = {
  Fuck: '#000000',
  Beginner: '#4a86e8',
  Easy: '#00ffff',
  Medium: '#00ff01',
  Hard: '#ffff00',
  'Very Hard': '#fe9900',
  Insane: '#fe0000',
  Extreme: '#ff00fe',
  Remorseless: '#9a00ff',
  Relentless: '#b088eb',
  Terrifying: '#f09eea',
  Catastrophic: '#f26666',
  Inexorable: '#ffc183',
  Excruciating: '#ffe59a',
  'Super Fucking Terrifying': '#000000',
  'Low End': '#00c0ed',
  'Low-Mid Range': '#00ff87',
  'Mid Range': '#ffcc00',
  'Mid-High Range': '#ff0080',
  'High End': '#a35cf6',
};

/** Black tiers need a lighter accent on dark card surfaces. */
const DARK_TIER_ON_DARK_UI = new Set(['Fuck', 'Super Fucking Terrifying']);

export function resolveNlwTierHex(tierName: string | null | undefined): string | null {
  const trimmed = tierName?.trim();
  if (!trimmed) {
    return null;
  }
  return NLW_TIER_COLORS[trimmed] ?? null;
}

export function resolveNlwTierDisplayColor(tierName: string | null | undefined): string | null {
  const trimmed = tierName?.trim();
  if (!trimmed) {
    return null;
  }
  const hex = NLW_TIER_COLORS[trimmed];
  if (!hex) {
    return null;
  }
  if (DARK_TIER_ON_DARK_UI.has(trimmed)) {
    return '#d4d4d4';
  }
  return hex;
}

/** CSS custom property for tier-colored pill styling in level-card.css. */
export function nlwTierPillVars(
  tierName: string | null | undefined,
): Record<string, string> | undefined {
  const displayColor = resolveNlwTierDisplayColor(tierName);
  if (!displayColor) {
    return undefined;
  }
  return { '--nlw-tier-color': displayColor };
}
