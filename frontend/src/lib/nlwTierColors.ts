/**
 * NLW tier presentation (Non-Listworthy Extreme Demons).
 *
 * AREDL sends only the tier name. Official colors are spreadsheet fills, so
 * they live here. A name missing from this table still renders: new tiers are
 * added at the hard end, so the pill uses a neutral accent and the crate land
 * uses the lethal sample until a row is added.
 */
export type NlwTierSound = 'easy' | 'hard' | 'extreme' | 'lethal' | 'neutral';

interface NlwTierStyle {
  color: string;
  sound: NlwTierSound;
  /** Black spreadsheet fills need a lighter accent on dark cards. */
  lightenOnDark?: boolean;
}

/** Readable stand-in until a new tier's spreadsheet color is added. */
const UNKNOWN_NLW_DISPLAY_COLOR = '#d4d4d4';

export const NLW_TIER_STYLES: Readonly<Record<string, NlwTierStyle>> = {
  Fuck: { color: '#000000', sound: 'lethal', lightenOnDark: true },
  Beginner: { color: '#4a86e8', sound: 'easy' },
  Easy: { color: '#00ffff', sound: 'easy' },
  Medium: { color: '#00ff01', sound: 'easy' },
  Hard: { color: '#ffff00', sound: 'hard' },
  'Very Hard': { color: '#fe9900', sound: 'hard' },
  Insane: { color: '#fe0000', sound: 'hard' },
  Extreme: { color: '#ff00fe', sound: 'extreme' },
  Remorseless: { color: '#9a00ff', sound: 'extreme' },
  Relentless: { color: '#b088eb', sound: 'extreme' },
  Terrifying: { color: '#f09eea', sound: 'lethal' },
  Catastrophic: { color: '#f26666', sound: 'lethal' },
  Inexorable: { color: '#ffc183', sound: 'lethal' },
  Excruciating: { color: '#ffe59a', sound: 'lethal' },
  Merciless: { color: '#a7e58d', sound: 'lethal' },
  'Super Fucking Terrifying': { color: '#000000', sound: 'neutral', lightenOnDark: true },
  'Low End': { color: '#00c0ed', sound: 'neutral' },
  'Low-Mid Range': { color: '#00ff87', sound: 'neutral' },
  'Mid Range': { color: '#ffcc00', sound: 'neutral' },
  'Mid-High Range': { color: '#ff0080', sound: 'neutral' },
  'High End': { color: '#a35cf6', sound: 'neutral' },
};

export const NLW_TIER_COLORS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(NLW_TIER_STYLES).map(([name, style]) => [name, style.color]),
);

function trimmedTier(tierName: string | null | undefined): string | null {
  const trimmed = tierName?.trim();
  return trimmed ? trimmed : null;
}

export function resolveNlwTierHex(tierName: string | null | undefined): string | null {
  const trimmed = trimmedTier(tierName);
  if (!trimmed) {
    return null;
  }
  return NLW_TIER_STYLES[trimmed]?.color ?? null;
}

export function resolveNlwTierDisplayColor(tierName: string | null | undefined): string | null {
  const trimmed = trimmedTier(tierName);
  if (!trimmed) {
    return null;
  }
  const style = NLW_TIER_STYLES[trimmed];
  if (!style) {
    return UNKNOWN_NLW_DISPLAY_COLOR;
  }
  if (style.lightenOnDark) {
    return '#d4d4d4';
  }
  return style.color;
}

/** Sound group for a tier name. Unknown names use the hard-end sample. */
export function resolveNlwTierSound(tierName: string | null | undefined): NlwTierSound | null {
  const trimmed = trimmedTier(tierName);
  if (!trimmed) {
    return null;
  }
  return NLW_TIER_STYLES[trimmed]?.sound ?? 'lethal';
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
