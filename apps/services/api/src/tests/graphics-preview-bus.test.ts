import test from 'node:test';
import assert from 'node:assert/strict';
import { nextPlaybackPreviewSpec, type PlaybackState } from '@toa-lib/models';
import {
  createGraphicsBroadcastReliabilityHarness,
  seedTimeline
} from './graphics-broadcast-reliability-harness.js';

/** PVW next-item selection exercised against exact states from the real API. */

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
  const loaded: PlaybackState = await harness.commands.load(
    eventKey,
    'timeline-a'
  );
  return { ...harness, loaded };
}

test('preview: with nothing on air, previews the item that the next take will air', async (t) => {
  const { loaded } = await loadedShow(t);

  // Nothing has been taken, so the "next thing to air" is the current item
  // itself - previewing item-1 here would be a step too far.
  assert.equal((loaded.program !== null), false);
  assert.equal(loaded.program, null);
  assert.equal(nextPlaybackPreviewSpec(loaded)?.id, 'item-0');
});

test('preview: once on air, is ONE STEP AHEAD of the program - never a mirror of it', async (t) => {
  const { commands, loaded } = await loadedShow(t);
  assert.equal(nextPlaybackPreviewSpec(loaded)?.id, 'item-0');

  const taken: PlaybackState = await commands.take(eventKey);

  // The core regression: program and preview must be DIFFERENT items.
  assert.equal((taken.program !== null), true);
  assert.equal(taken.program?.graphic.spec?.id, 'item-0');
  assert.equal(nextPlaybackPreviewSpec(taken)?.id, 'item-1');
  assert.notEqual(nextPlaybackPreviewSpec(taken)?.id, taken.program?.graphic.spec?.id);
});

test('preview: follows the show forward, staying exactly one ahead through each Go', async (t) => {
  const { commands } = await loadedShow(t);
  await commands.take(eventKey);

  // A producer "Go" is advance + take together (see `handleGo` in
  // graphics-controller.tsx) - the exact sequence that used to leave the cue
  // holding what was already on air.
  await commands.advance(eventKey);
  const second: PlaybackState = await commands.take(eventKey);
  assert.equal(second.program?.graphic.spec?.id, 'item-1');
  assert.equal(nextPlaybackPreviewSpec(second)?.id, 'item-2');

  await commands.advance(eventKey);
  const third: PlaybackState = await commands.take(eventKey);
  assert.equal(third.program?.graphic.spec?.id, 'item-2');
  // Past the last item is a legitimate "nothing next", not an error.
  assert.equal(nextPlaybackPreviewSpec(third), null);
});

test('preview: anchors to the program, not the transport, when the cue is scrubbed ahead', async (t) => {
  const { commands } = await loadedShow(t);
  const taken: PlaybackState = await commands.take(eventKey);
  assert.equal(taken.program?.graphic.spec?.id, 'item-0');

  // Navigate the transport forward TWICE without ever taking: the cue is now
  // two items ahead of the program, but the audience is still seeing item-0.
  await commands.advance(eventKey);
  const scrubbed: PlaybackState = await commands.advance(eventKey);

  assert.equal(scrubbed.loaded?.index, 2, 'the transport really did move two items on');
  assert.equal(
    scrubbed.program?.graphic.spec?.id,
    'item-0',
    'the program is untouched by navigation'
  );
  // Keyed off the transport this would say item-2; the next graphic in the
  // SHOW is still item-1, which is what a PVW monitor must display.
  assert.equal(nextPlaybackPreviewSpec(scrubbed)?.id, 'item-1');
});

test('preview: after a clear, falls back to previewing whatever the transport is cued to', async (t) => {
  const { commands } = await loadedShow(t);
  await commands.take(eventKey);
  await commands.advance(eventKey);

  const cleared: PlaybackState = await commands.clear(eventKey);

  // With nothing on air there is no program to be "one ahead of", so the
  // preview shows what a take would put up next - the cued item.
  assert.equal((cleared.program !== null), false);
  assert.equal(cleared.program, null);
  assert.equal(nextPlaybackPreviewSpec(cleared)?.id, 'item-1');
});

test('preview: an event that has never loaded anything has no preview at all', async (t) => {
  const harness = await createGraphicsBroadcastReliabilityHarness(t);
  const state: PlaybackState = await harness.commands.getState('event-b');
  assert.equal(nextPlaybackPreviewSpec(state), null);
  assert.equal(state.program, null);
});

test('preview: a newly loaded snapshot uses its cursor while an older show stays on program', async (t) => {
  const { commands, repository } = await loadedShow(t);
  await commands.take(eventKey);
  await seedTimeline(repository, eventKey, 'timeline-b', ['new-0', 'new-1']);
  const state = await commands.load(eventKey, 'timeline-b');
  assert.equal(state.program?.graphic.spec.id, 'item-0');
  assert.equal(nextPlaybackPreviewSpec(state)?.id, 'new-0');
  const moved = await commands.advance(eventKey);
  assert.equal(nextPlaybackPreviewSpec(moved)?.id, 'new-1');
});
