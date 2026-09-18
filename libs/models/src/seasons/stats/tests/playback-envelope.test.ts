import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyPlaybackState,
  createPlaybackStateEnvelope,
  playbackStateEnvelopeZod
} from '../../../base/Graphics.js';

test('playback envelope is strict, versioned, and event-consistent', () => {
  const state = createEmptyPlaybackState('event-a', '2026-01-01T00:00:00.000Z');
  const envelope = createPlaybackStateEnvelope('authority-a', state);

  assert.equal(envelope.schemaVersion, 1);
  assert.equal(envelope.eventKey, 'event-a');
  assert.equal(envelope.state.revision, 0);
  assert.equal(envelope.state.cue.status, 'empty');
  assert.equal(envelope.state.stagedUpdate.status, 'empty');

  assert.equal(
    playbackStateEnvelopeZod.safeParse({ ...envelope, unexpected: true })
      .success,
    false
  );
  assert.equal(
    playbackStateEnvelopeZod.safeParse({ ...envelope, schemaVersion: 2 })
      .success,
    false
  );
  assert.equal(
    playbackStateEnvelopeZod.safeParse({ ...envelope, eventKey: 'event-b' })
      .success,
    false
  );
});
