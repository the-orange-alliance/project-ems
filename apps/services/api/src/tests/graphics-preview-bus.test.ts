import test from 'node:test';
import assert from 'node:assert/strict';
import type { LiveGraphicState } from '@toa-lib/models';
import {
  createGraphicsBroadcastReliabilityHarness,
  seedTimeline
} from './graphics-broadcast-reliability-harness.js';

/**
 * The preview (PVW) bus contract, exercised through the REAL compiled
 * realtime relay (`toLegacyState`) against the real API - the same harness
 * `graphics-broadcast-reliability.test.ts` uses.
 *
 * The rule under test: `previewSpec` is the item ONE STEP AHEAD of what is
 * on air, anchored to the PROGRAM's position rather than the transport's.
 *
 * The regression these guard against: `previewSpec` was originally derived
 * from `state.cue`, but `take` copies the cue into `program` and leaves the
 * cue untouched, so from the first take onwards the cue holds exactly what
 * is already on air - a cue-fed preview mirrored the program instead of
 * previewing it.
 */

const eventKey = 'event-a';

async function loadedShow(
  t: Parameters<typeof createGraphicsBroadcastReliabilityHarness>[0]
) {
  const harness = await createGraphicsBroadcastReliabilityHarness(t);
  await seedTimeline(harness.repository, eventKey, 'timeline-a', [
    'item-0',
    'item-1',
    'item-2'
  ]);
  const loaded: LiveGraphicState = await harness.realtime.load(
    eventKey,
    'timeline-a'
  );
  return { ...harness, loaded };
}

test('preview: with nothing on air, previews the item that the next take will air', async (t) => {
  const { loaded } = await loadedShow(t);

  // Nothing has been taken, so the "next thing to air" is the current item
  // itself - previewing item-1 here would be a step too far.
  assert.equal(loaded.onAir, false);
  assert.equal(loaded.spec, null);
  assert.equal(loaded.previewSpec?.id, 'item-0');
});

test('preview: once on air, is ONE STEP AHEAD of the program - never a mirror of it', async (t) => {
  const { realtime, loaded } = await loadedShow(t);
  assert.equal(loaded.previewSpec?.id, 'item-0');

  const taken: LiveGraphicState = await realtime.take(eventKey);

  // The core regression: program and preview must be DIFFERENT items.
  assert.equal(taken.onAir, true);
  assert.equal(taken.spec?.id, 'item-0');
  assert.equal(taken.previewSpec?.id, 'item-1');
  assert.notEqual(taken.previewSpec?.id, taken.spec?.id);
});

test('preview: follows the show forward, staying exactly one ahead through each Go', async (t) => {
  const { realtime } = await loadedShow(t);
  await realtime.take(eventKey);

  // A producer "Go" is advance + take together (see `handleGo` in
  // graphics-controller.tsx) - the exact sequence that used to leave the cue
  // holding what was already on air.
  await realtime.advance(eventKey);
  const second: LiveGraphicState = await realtime.take(eventKey);
  assert.equal(second.spec?.id, 'item-1');
  assert.equal(second.previewSpec?.id, 'item-2');

  await realtime.advance(eventKey);
  const third: LiveGraphicState = await realtime.take(eventKey);
  assert.equal(third.spec?.id, 'item-2');
  // Past the last item is a legitimate "nothing next", not an error.
  assert.equal(third.previewSpec, null);
});

test('preview: anchors to the program, not the transport, when the cue is scrubbed ahead', async (t) => {
  const { realtime } = await loadedShow(t);
  const taken: LiveGraphicState = await realtime.take(eventKey);
  assert.equal(taken.spec?.id, 'item-0');

  // Navigate the transport forward TWICE without ever taking: the cue is now
  // two items ahead of the program, but the audience is still seeing item-0.
  await realtime.advance(eventKey);
  const scrubbed: LiveGraphicState = await realtime.advance(eventKey);

  assert.equal(scrubbed.index, 2, 'the transport really did move two items on');
  assert.equal(
    scrubbed.spec?.id,
    'item-0',
    'the program is untouched by navigation'
  );
  // Keyed off the transport this would say item-2; the next graphic in the
  // SHOW is still item-1, which is what a PVW monitor must display.
  assert.equal(scrubbed.previewSpec?.id, 'item-1');
});

test('preview: after a clear, falls back to previewing whatever the transport is cued to', async (t) => {
  const { realtime } = await loadedShow(t);
  await realtime.take(eventKey);
  await realtime.advance(eventKey);

  const cleared: LiveGraphicState = await realtime.clear(eventKey);

  // With nothing on air there is no program to be "one ahead of", so the
  // preview shows what a take would put up next - the cued item.
  assert.equal(cleared.onAir, false);
  assert.equal(cleared.spec, null);
  assert.equal(cleared.previewSpec?.id, 'item-1');
});

test('preview: an event that has never loaded anything has no preview at all', async (t) => {
  const harness = await createGraphicsBroadcastReliabilityHarness(t);
  const state: LiveGraphicState = await harness.realtime.getState('event-b');
  assert.equal(state.previewSpec, null);
  assert.equal(state.spec, null);
});
