/**
 * Plain-script exercise of `choreography.ts`.
 *
 * `apps/web` has no test runner, so this follows the same convention as
 * `transition-machine.selftest.ts` next to it: a plain TypeScript script
 * needing nothing but `node:assert/strict`.
 *
 * Run from the repo root:
 *   npx tsx apps/web/src/apps/audience-display/displays/graphics/choreography.selftest.ts
 *
 * `tsx` (already a devDependency in this monorepo) rather than Node's bare
 * type stripping, because the import below uses the `.js` specifier that
 * `tsc` requires under `moduleResolution: nodenext` - Node's stripper will
 * not remap that to `.ts`, but tsx will. Keeping the `.js` specifier is what
 * lets this file stay inside `npm run check-types` instead of having to be
 * excluded from the build.
 */

import assert from 'node:assert/strict';
import { chooseChoreography } from './choreography.js';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

console.log('choreography');

check('two sequential drawers crossfade - the container never moves', () => {
  assert.equal(chooseChoreography('drawer-left', 'drawer-left'), 'crossfade');
  assert.equal(chooseChoreography('drawer-right', 'drawer-right'), 'crossfade');
  assert.equal(chooseChoreography('lower-third', 'lower-third'), 'crossfade');
  assert.equal(chooseChoreography('fullscreen', 'fullscreen'), 'crossfade');
});

check('a mode change exits, holds, then enters', () => {
  assert.equal(
    chooseChoreography('drawer-left', 'fullscreen'),
    'exit-hold-enter'
  );
  // Opposite drawers are still a mode change - the panel has to physically
  // move from one side to the other.
  assert.equal(
    chooseChoreography('drawer-left', 'drawer-right'),
    'exit-hold-enter'
  );
});

check('the empty boundaries', () => {
  assert.equal(chooseChoreography(null, null), 'none');
  assert.equal(chooseChoreography('drawer-left', null), 'exit-only');
  assert.equal(chooseChoreography(null, 'drawer-left'), 'enter-only');
});

/**
 * REGRESSION - the intermittent "two drawers animate out and back in" bug.
 *
 * The preview screen's frame query blanked its data to `undefined` while a
 * new item was in flight (SWR's default when a key changes without
 * `keepPreviousData`). That turned ONE drawer -> drawer change into TWO
 * changes with a null in between, and each half independently picks a
 * container animation - which is precisely what the producer saw. It only
 * happened on a cache MISS, hence "sometimes".
 */
check(
  'REGRESSION: a null gap between two drawers is what caused exit+enter',
  () => {
    // What the gap produced: two separate container animations.
    assert.equal(chooseChoreography('drawer-left', null), 'exit-only');
    assert.equal(chooseChoreography(null, 'drawer-left'), 'enter-only');
    // What it must be once the previous frame is held through the fetch.
    assert.equal(chooseChoreography('drawer-left', 'drawer-left'), 'crossfade');
  }
);

/**
 * REGRESSION - "replay should cut back to the previous graphic, then run the
 * transition".
 *
 * A replay cuts to whatever is on the PROGRAM bus and then runs the normal
 * choreography from it. So replaying a drawer whose program is also a drawer
 * must crossfade - the old implementation always forced exit -> hold ->
 * enter, showing an animation that will never actually occur on air.
 */
check(
  'REGRESSION: replay from a same-mode program crossfades, never exit+enter',
  () => {
    const programMode = 'drawer-left';
    const previewMode = 'drawer-left';
    assert.equal(chooseChoreography(programMode, previewMode), 'crossfade');
  }
);

check('replay with nothing on air is a plain entrance onto black', () => {
  assert.equal(chooseChoreography(null, 'drawer-left'), 'enter-only');
});

console.log(`\n${passed} checks passed`);
