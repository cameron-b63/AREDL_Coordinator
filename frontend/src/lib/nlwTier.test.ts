import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveCrateSoundTier } from './levelCrateSoundTier.ts';
import { resolveLevelListBadge } from './levelListBadge.ts';
import { resolveNlwTierDisplayColor, resolveNlwTierHex } from './nlwTierColors.ts';
import type { BoardLevel } from './types/board.ts';

function level(partial: Pick<BoardLevel, 'position'> & { nlwTier?: string | null }): BoardLevel {
  return {
    id: 'x',
    name: 'x',
    points: 0,
    gameLevelId: 1,
    twoPlayer: false,
    tags: [],
    listPageUrl: '',
    completion: { state: 'uncompleted' },
    claim: { menuEnabled: false, active: null },
    ...partial,
  };
}

test('known tiers keep their spreadsheet color and sound group', () => {
  assert.equal(resolveNlwTierHex('Merciless'), '#a7e58d');
  assert.equal(resolveNlwTierDisplayColor('Merciless'), '#a7e58d');
  assert.equal(resolveCrateSoundTier(level({ position: 169, nlwTier: 'Merciless' })), 'lethal');

  assert.equal(resolveNlwTierHex('Beginner'), '#4a86e8');
  assert.equal(resolveCrateSoundTier(level({ position: 400, nlwTier: 'Beginner' })), 'easy');
  assert.equal(resolveCrateSoundTier(level({ position: 400, nlwTier: 'Low End' })), 'neutral');
  assert.equal(resolveNlwTierDisplayColor('Fuck'), '#d4d4d4');
});

test('an unrecognized tier still badges and uses the hard-end sound', () => {
  assert.equal(resolveNlwTierHex('Whatever Comes Next'), null);
  assert.equal(resolveNlwTierDisplayColor('Whatever Comes Next'), '#d4d4d4');
  assert.equal(
    resolveCrateSoundTier(level({ position: 160, nlwTier: 'Whatever Comes Next' })),
    'lethal',
  );

  const badge = resolveLevelListBadge(level({ position: 160, nlwTier: '  Whatever Comes Next  ' }));
  assert.deepEqual(badge, {
    kind: 'nlw',
    label: 'Whatever Comes Next',
    pillVars: { '--nlw-tier-color': '#d4d4d4' },
  });
});

test('list placement still beats an NLW tier, and a missing tier stays blank', () => {
  const main = resolveLevelListBadge(level({ position: 10, nlwTier: 'Merciless' }));
  assert.equal(main?.kind, 'main');
  assert.equal(resolveLevelListBadge(level({ position: 200, nlwTier: '   ' })), null);
  assert.equal(resolveCrateSoundTier(level({ position: 8 })), 'apex10');
  assert.equal(resolveCrateSoundTier(level({ position: 200 })), 'neutral');
});
