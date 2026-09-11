import test from 'node:test';
import assert from 'node:assert/strict';
import {
  playbackStateZod,
  preparedGraphicZod,
  presentationFrameZod,
  type GraphicSpec,
  type PlaybackCommand,
  type PlaybackState,
  type PreparedGraphic
} from '@toa-lib/models/base';
import {
  PlaybackCoordinator,
  type PlaybackMutation,
  type PlaybackStorage,
  type PreparationTicket
} from '../graphics/PlaybackCoordinator.js';
import { graphicsFixture, sampleGraphic } from './graphics-test-support.js';

/** Test-only stand-in for a real operation module's mutation: no navigation semantics are implemented here. */
const clearMutation: PlaybackMutation = (draft) => {
  draft.cue = { status: 'empty' };
  draft.program = null;
  draft.stagedUpdate = { status: 'empty' };
};
const noopMutation: PlaybackMutation = () => {};

function frameFor(spec: GraphicSpec, atUtc: string) {
  return presentationFrameZod.parse({
    schemaVersion: 2,
    kind: spec.kind,
    title: spec.title,
    asOfUtc: atUtc,
    quality: 'complete',
    warnings: [],
    series: [],
    data: {
      kind: 'stat-tile',
      values: [
        {
          id: 'v1',
          label: 'Score',
          value: 42,
          format: { style: 'number', scale: 1 }
        }
      ]
    }
  });
}

/** Builds a PreparedGraphic that matches a ticket's exact target and spec, as completePreparation requires. */
function preparedGraphicFor(
  ticket: PreparationTicket,
  atUtc: string
): PreparedGraphic {
  return preparedGraphicZod.parse({
    target: ticket.target,
    spec: ticket.spec,
    frame: frameFor(ticket.spec, atUtc),
    preparedAtUtc: atUtc
  });
}

function seedState(
  eventKey: string,
  revision: number,
  fields: Partial<PlaybackState>
): PlaybackState {
  return playbackStateZod.parse({
    schemaVersion: 2,
    eventKey,
    revision,
    loaded: null,
    cue: { status: 'empty' },
    program: null,
    stagedUpdate: { status: 'empty' },
    transition: null,
    lastCommandId: `seed-${revision}`,
    updatedAtUtc: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    ...fields
  });
}

test('overlapping cue preparations: completing a superseded ticket is rejected and never becomes ready', async (t) => {
  const { repository } = await graphicsFixture(t);
  const coordinator = new PlaybackCoordinator({ storage: repository });
  const eventKey = 'event-a';
  const specA = sampleGraphic('spec-a');
  const specB = sampleGraphic('spec-b');

  const first = await coordinator.beginPreparation(
    eventKey,
    { type: 'cue', requestId: 'prep-a', spec: specA },
    { lane: 'cue', spec: specA }
  );
  assert.equal(first.acknowledgment.ok, true);
  const ticketA = first.ticket!;

  const second = await coordinator.beginPreparation(
    eventKey,
    { type: 'cue', requestId: 'prep-b', spec: specB },
    { lane: 'cue', spec: specB }
  );
  assert.equal(second.acknowledgment.ok, true);
  const ticketB = second.ticket!;

  const completedA = await coordinator.completePreparation(
    ticketA,
    preparedGraphicFor(ticketA, new Date().toISOString())
  );
  assert.equal(completedA.ok, false);
  if (completedA.ok) return;
  assert.equal(completedA.error.code, 'SUPERSEDED');

  const midState = await coordinator.getState(eventKey);
  assert.equal(midState.cue.status, 'calculating');

  const completedB = await coordinator.completePreparation(
    ticketB,
    preparedGraphicFor(ticketB, new Date().toISOString())
  );
  assert.equal(completedB.ok, true);

  const finalState = await coordinator.getState(eventKey);
  assert.equal(finalState.cue.status, 'ready');
  if (finalState.cue.status === 'ready')
    assert.equal(finalState.cue.graphic.spec.id, 'spec-b');
});

test('mutate: replaying the same requestId returns the original acknowledgment marked replayed', async (t) => {
  const { repository } = await graphicsFixture(t);
  const coordinator = new PlaybackCoordinator({ storage: repository });
  const eventKey = 'event-a';
  const command: PlaybackCommand = { type: 'clear', requestId: 'dup-1' };

  const original = await coordinator.mutate(eventKey, command, clearMutation);
  assert.equal(original.ok, true);
  if (!original.ok) return;
  assert.equal(original.replayed, false);

  const replay = await coordinator.mutate(eventKey, command, clearMutation);
  assert.equal(replay.ok, true);
  if (!replay.ok) return;
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.state, original.state);

  const state = await coordinator.getState(eventKey);
  assert.equal(state.revision, original.state.revision);
});

test('mutate: reusing a requestId with a different command payload is rejected as CONFLICT', async (t) => {
  const { repository } = await graphicsFixture(t);
  const coordinator = new PlaybackCoordinator({ storage: repository });
  const eventKey = 'event-a';
  const requestId = 'reuse-1';

  const first = await coordinator.mutate(
    eventKey,
    { type: 'clear', requestId },
    clearMutation
  );
  assert.equal(first.ok, true);
  if (!first.ok) return;

  const spec = sampleGraphic('spec-conflict');
  const second = await coordinator.mutate(
    eventKey,
    { type: 'cue', requestId, spec },
    noopMutation
  );
  assert.equal(second.ok, false);
  if (second.ok) return;
  assert.equal(second.error.code, 'CONFLICT');
  assert.equal(second.error.retryable, false);

  const state = await coordinator.getState(eventKey);
  assert.equal(state.revision, first.state.revision);
});

test('mutate and preparation state for one event never affects another event', async (t) => {
  const { repository } = await graphicsFixture(t);
  const coordinator = new PlaybackCoordinator({ storage: repository });
  const specA = sampleGraphic('spec-indep-a');

  const acceptanceA = await coordinator.beginPreparation(
    'event-a',
    { type: 'cue', requestId: 'indep-a', spec: specA },
    { lane: 'cue', spec: specA }
  );
  assert.equal(acceptanceA.acknowledgment.ok, true);

  const stateBBefore = await coordinator.getState('event-b');
  assert.equal(stateBBefore.revision, 0);
  assert.equal(stateBBefore.cue.status, 'empty');
  assert.equal(stateBBefore.eventKey, 'event-b');

  const clearB = await coordinator.mutate(
    'event-b',
    { type: 'clear', requestId: 'indep-b' },
    clearMutation
  );
  assert.equal(clearB.ok, true);

  const stateA = await coordinator.getState('event-a');
  assert.equal(stateA.revision, 1);
  assert.equal(stateA.cue.status, 'calculating');
  assert.equal(stateA.eventKey, 'event-a');

  const stateBAfter = await coordinator.getState('event-b');
  assert.equal(stateBAfter.revision, 1);
  assert.equal(stateBAfter.eventKey, 'event-b');
});

test('mutate: a persistence failure leaves in-memory state and durability untouched', async (t) => {
  const { repository } = await graphicsFixture(t);
  let failNext = true;
  const storage: PlaybackStorage = {
    loadPlayback: (eventKey) => repository.loadPlayback(eventKey),
    loadCommand: (eventKey, requestId) =>
      repository.loadCommand(eventKey, requestId),
    savePlayback: (eventKey, state, expectedRevision, command) => {
      if (failNext) {
        failNext = false;
        return Promise.reject(new Error('simulated disk failure'));
      }
      return repository.savePlayback(
        eventKey,
        state,
        expectedRevision,
        command
      );
    }
  };
  const coordinator = new PlaybackCoordinator({ storage });
  const eventKey = 'event-a';

  const failed = await coordinator.mutate(
    eventKey,
    { type: 'clear', requestId: 'fail-1' },
    clearMutation
  );
  assert.equal(failed.ok, false);
  if (failed.ok) return;
  assert.equal(failed.error.code, 'UNAVAILABLE');
  assert.equal(failed.error.retryable, true);

  const state = await coordinator.getState(eventKey);
  assert.equal(state.revision, 0);

  // The failed write recorded no command: the same requestId is free to try again, not "replayed".
  const retried = await coordinator.mutate(
    eventKey,
    { type: 'clear', requestId: 'fail-1' },
    clearMutation
  );
  assert.equal(retried.ok, true);
  if (!retried.ok) return;
  assert.equal(retried.replayed, false);
  assert.equal(retried.state.revision, 1);
});

test('deliveryHealth reports a pending revision and the last publication error while publish keeps failing', async (t) => {
  const { repository } = await graphicsFixture(t);
  const errors: unknown[] = [];
  const coordinator = new PlaybackCoordinator({
    storage: repository,
    publish: async () => {
      throw new Error('relay unavailable');
    },
    onPublicationError: (_eventKey, error) => errors.push(error)
  });
  const eventKey = 'event-a';

  const ack = await coordinator.mutate(
    eventKey,
    { type: 'clear', requestId: 'pub-health-1' },
    clearMutation
  );
  assert.equal(ack.ok, true);
  if (!ack.ok) return;

  // Join the fire-and-forget publish attempt the commit already queued, rather than racing it.
  await coordinator.retryPublication(eventKey).catch(() => {});

  const health = coordinator.deliveryHealth(eventKey);
  assert.equal(health.pendingRevision, ack.state.revision);
  assert.ok(health.error?.includes('relay unavailable'));
  assert.ok(errors.length > 0);
});

test('retryPublication recovers a pending publication once the delivery target starts succeeding again', async (t) => {
  const { repository } = await graphicsFixture(t);
  let shouldFail = true;
  const delivered: PlaybackState[] = [];
  const coordinator = new PlaybackCoordinator({
    storage: repository,
    publish: async (_eventKey, state) => {
      if (shouldFail) throw new Error('relay unavailable');
      delivered.push(state);
    }
  });
  const eventKey = 'event-a';

  const ack = await coordinator.mutate(
    eventKey,
    { type: 'clear', requestId: 'pub-retry-1' },
    clearMutation
  );
  assert.equal(ack.ok, true);
  if (!ack.ok) return;
  await coordinator.retryPublication(eventKey).catch(() => {});
  assert.ok(coordinator.deliveryHealth(eventKey).error);

  shouldFail = false;
  await coordinator.retryPublication(eventKey);

  const health = coordinator.deliveryHealth(eventKey);
  assert.equal(health.pendingRevision, null);
  assert.equal(health.error, null);
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].revision, ack.state.revision);
});

test('revisions are monotonic across a simulated process restart backed by the same storage', async (t) => {
  const { repository } = await graphicsFixture(t);
  const eventKey = 'event-a';

  const coordinator1 = new PlaybackCoordinator({ storage: repository });
  const first = await coordinator1.mutate(
    eventKey,
    { type: 'clear', requestId: 'restart-1' },
    clearMutation
  );
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.state.revision, 1);

  // A fresh instance stands in for a restarted process: no in-memory state is shared with coordinator1.
  const coordinator2 = new PlaybackCoordinator({ storage: repository });
  const restored = await coordinator2.getState(eventKey);
  assert.equal(restored.revision, 1);

  const second = await coordinator2.mutate(
    eventKey,
    { type: 'clear', requestId: 'restart-2' },
    clearMutation
  );
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.state.revision, 2);

  const coordinator3 = new PlaybackCoordinator({ storage: repository });
  const finalState = await coordinator3.getState(eventKey);
  assert.equal(finalState.revision, 2);
});

test('a clear arriving while a cue preparation is pending supersedes it: completion afterwards is rejected', async (t) => {
  const { repository } = await graphicsFixture(t);
  const coordinator = new PlaybackCoordinator({ storage: repository });
  const eventKey = 'event-a';
  const spec = sampleGraphic('spec-clear-race');

  const begun = await coordinator.beginPreparation(
    eventKey,
    { type: 'cue', requestId: 'race-cue', spec },
    { lane: 'cue', spec }
  );
  assert.equal(begun.acknowledgment.ok, true);
  const ticket = begun.ticket!;

  const cleared = await coordinator.mutate(
    eventKey,
    { type: 'clear', requestId: 'race-clear' },
    clearMutation
  );
  assert.equal(cleared.ok, true);

  const completed = await coordinator.completePreparation(
    ticket,
    preparedGraphicFor(ticket, new Date().toISOString())
  );
  assert.equal(completed.ok, false);
  if (completed.ok) return;
  assert.equal(completed.error.code, 'SUPERSEDED');

  const state = await coordinator.getState(eventKey);
  assert.equal(state.cue.status, 'empty');
});

test('restart recovery: a persisted program is restored exactly, with no recalculation', async (t) => {
  const { repository } = await graphicsFixture(t);
  const eventKey = 'event-a';
  const atUtc = new Date('2026-01-01T00:00:00.000Z').toISOString();
  const spec = sampleGraphic('spec-restore');
  const target = {
    targetId: 'target-restore',
    targetRevision: 1,
    requestId: 'seed-1',
    snapshotId: null,
    index: null
  };
  const graphic = preparedGraphicZod.parse({
    target,
    spec,
    frame: frameFor(spec, atUtc),
    preparedAtUtc: atUtc
  });
  const seeded = seedState(eventKey, 1, {
    cue: { status: 'ready', graphic },
    program: { revision: 1, graphic, takenAtUtc: atUtc },
    lastCommandId: 'seed-1'
  });
  await repository.savePlayback(eventKey, seeded, 0);

  // A fresh coordinator, never asked to prepare or calculate anything, only reads state.
  const coordinator = new PlaybackCoordinator({ storage: repository });
  const restored = await coordinator.getState(eventKey);
  assert.equal(restored.revision, 1);
  assert.deepEqual(restored.program, seeded.program);
  assert.deepEqual(restored.cue, seeded.cue);
});

test('restart recovery: a persisted cleared state stays cleared even though it once had a program', async (t) => {
  const { repository } = await graphicsFixture(t);
  const eventKey = 'event-b';
  const atUtc = new Date('2026-01-01T00:00:00.000Z').toISOString();
  const spec = sampleGraphic('spec-was-live');
  const target = {
    targetId: 'target-was-live',
    targetRevision: 1,
    requestId: 'seed-live',
    snapshotId: null,
    index: null
  };
  const graphic = preparedGraphicZod.parse({
    target,
    spec,
    frame: frameFor(spec, atUtc),
    preparedAtUtc: atUtc
  });
  const withProgram = seedState(eventKey, 1, {
    cue: { status: 'ready', graphic },
    program: { revision: 1, graphic, takenAtUtc: atUtc },
    lastCommandId: 'seed-live'
  });
  await repository.savePlayback(eventKey, withProgram, 0);

  const cleared = seedState(eventKey, 2, {
    cue: { status: 'empty' },
    program: null,
    lastCommandId: 'seed-clear'
  });
  await repository.savePlayback(eventKey, cleared, 1);

  const coordinator = new PlaybackCoordinator({ storage: repository });
  const restored = await coordinator.getState(eventKey);
  assert.equal(restored.revision, 2);
  assert.equal(restored.program, null);
  assert.equal(restored.cue.status, 'empty');
});

test('restart recovery: a persisted calculating cue is rewritten to failed, and the rewrite is durable', async (t) => {
  const { repository } = await graphicsFixture(t);
  const eventKey = 'event-a';
  const atUtc = new Date('2026-01-01T00:00:00.000Z').toISOString();
  const spec = sampleGraphic('spec-interrupted');
  const target = {
    targetId: 'target-interrupted',
    targetRevision: 1,
    requestId: 'seed-interrupted',
    snapshotId: null,
    index: null
  };
  const interrupted = seedState(eventKey, 1, {
    cue: { status: 'calculating', target, spec },
    lastCommandId: 'seed-interrupted'
  });
  await repository.savePlayback(eventKey, interrupted, 0);

  const coordinator = new PlaybackCoordinator({ storage: repository });
  const restored = await coordinator.getState(eventKey);
  assert.equal(restored.revision, 2);
  assert.equal(restored.cue.status, 'failed');
  if (restored.cue.status === 'failed')
    assert.equal(restored.cue.error.code, 'INTERRUPTED');

  // The rewrite is persisted, not recomputed on every access: a second fresh coordinator sees it too.
  const coordinator2 = new PlaybackCoordinator({ storage: repository });
  const again = await coordinator2.getState(eventKey);
  assert.equal(again.revision, 2);
  assert.equal(again.cue.status, 'failed');
});
