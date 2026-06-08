# Crate sound assets

Custom land stingers for the random level crate animation. **Spin ticks are procedural** — no spin asset is used.

## Where to put files

Drop audio files in this directory:

```
frontend/public/sounds/crate/
```

Vite serves `public/` at the site root, so at runtime they load from:

```
{sounds/crate/<filename>}
```

(with your app base path prefix if configured in `vite.config.ts`).

Supported formats: anything `AudioContext.decodeAudioData` accepts in the browser (typically `.wav`, `.ogg`, `.mp3`).

## Required filenames

Use these names, or change the mapping in code (see below):

| File | When it plays |
|------|----------------|
| `land-easy.ogg` | NLW tiers: Beginner, Easy, Medium |
| `land-neutral.ogg` | NLW tiers not in a named group; list position &gt; 150 |
| `land-hard.ogg` | NLW: Hard, Very Hard, Insane |
| `land-extreme.ogg` | NLW: Extreme, Remorseless, Relentless |
| `land-lethal.ogg` | NLW: Terrifying through Fuck |
| `land-apex150.ogg` | No NLW tier, position 76–150 |
| `land-apex75.ogg` | No NLW tier, position 11–75 |
| `land-apex10.ogg` | No NLW tier, position 1–10 |

Extension is only a convention — update `LAND_FILES` if you use `.wav` etc.

## Where to link them up in code

1. **Filename → tier mapping** — `frontend/src/lib/crateSounds.ts`, `LAND_FILES`
2. **Per-tier volume** — same file, `LAND_GAIN`
3. **Which tier a level gets** — `frontend/src/lib/levelCrateSoundTier.ts`, `resolveCrateSoundTier()`
4. **When sounds fire** — `frontend/src/components/ui/RandomLevelCrateOverlay.tsx`
   - `playSpinClick()` on each reel tile crossing while spinning
   - `playLand(tier)` when the winner is revealed
5. **User toggle** — Settings → “Play sound effects” (`randomLevelCrateSound` pref)

## Quick checklist

- [ ] Add all eight `land-*.ogg` (or `.wav`) files to this folder
- [ ] Adjust `LAND_FILES` if your filenames differ
- [ ] Tune `LAND_GAIN` so quieter tiers aren’t drowned out
- [ ] Roll a random level with sound on and verify each tier group
