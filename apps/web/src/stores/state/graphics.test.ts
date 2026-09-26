import {
  createEmptyPlaybackState,
  createPlaybackStateEnvelope,
  playbackStateZod,
  type PlaybackStateEnvelope
} from '@toa-lib/models';
import { createStore } from 'jotai';
import { describe, expect, it } from 'vitest';
import { eventKeyAtom } from './event.js';
import {
  applyPlaybackEnvelope,
  playbackCueForEventAtom,
  playbackErrorsForEventAtom,
  playbackEventStoreAtom,
  playbackLoadedForEventAtom,
  playbackProgramForEventAtom,
  playbackStateForEventAtom,
  playbackStagedUpdateForEventAtom,
  playbackTransitionForEventAtom,
  type PlaybackEventRecord
} from './graphics.js';

const AT = '2026-01-01T00:00:00.000Z';

function envelope(
  eventKey: string,
  authorityEpoch: string,
  revision: number
): PlaybackStateEnvelope {
  return createPlaybackStateEnvelope(authorityEpoch, {
    ...createEmptyPlaybackState(eventKey, AT),
    revision
  });
}

function accept(
  current: PlaybackEventRecord | undefined,
  next: unknown
): PlaybackEventRecord {
  const decision = applyPlaybackEnvelope(current, next);
  expect(decision.accepted).toBe(true);
  if (!decision.accepted) throw new Error(decision.reason);
  return decision.record;
}

describe('authoritative playback ordering', () => {
  it('accepts first delivery and equal-revision replay', () => {
    const first = accept(undefined, envelope('event-a', 'epoch-a', 4));
    const replay = applyPlaybackEnvelope(
      first,
      envelope('event-a', 'epoch-a', 4)
    );
    expect(replay.accepted).toBe(true);
    expect(replay.reason).toBe('equal-replay');
  });

  it('atomically accepts a lower revision on a new epoch and retires the old epoch', () => {
    const old = accept(undefined, envelope('event-a', 'epoch-a', 87));
    const restarted = applyPlaybackEnvelope(
      old,
      envelope('event-a', 'epoch-b', 1)
    );
    expect(restarted.accepted).toBe(true);
    expect(restarted.reason).toBe('new-epoch');
    if (!restarted.accepted) return;
    expect(restarted.record.envelope.state.revision).toBe(1);

    const delayedOld = applyPlaybackEnvelope(
      restarted.record,
      envelope('event-a', 'epoch-a', 99)
    );
    expect(delayedOld).toMatchObject({
      accepted: false,
      reason: 'retired-epoch'
    });
  });

  it('rejects lower revisions within an epoch and malformed schemas', () => {
    const current = accept(undefined, envelope('event-a', 'epoch-a', 5));
    expect(
      applyPlaybackEnvelope(current, envelope('event-a', 'epoch-a', 4))
    ).toMatchObject({ accepted: false, reason: 'stale' });
    expect(
      applyPlaybackEnvelope(current, {
        ...envelope('event-a', 'epoch-a', 6),
        schemaVersion: 999
      })
    ).toMatchObject({ accepted: false, reason: 'invalid' });
  });
});

describe('event-scoped playback selectors', () => {
  it('isolates two events and lets a pinned display select independently of the global event', () => {
    const store = createStore();
    const a = accept(undefined, envelope('event-a', 'epoch-a', 2));
    const bEnvelope = envelope('event-b', 'epoch-b', 7);
    const b = accept(undefined, bEnvelope);
    store.set(eventKeyAtom, 'event-a');
    store.set(playbackEventStoreAtom, { 'event-a': a, 'event-b': b });

    expect(store.get(playbackStateForEventAtom('event-a'))?.revision).toBe(2);
    expect(store.get(playbackStateForEventAtom('event-b'))?.revision).toBe(7);
    expect(store.get(eventKeyAtom)).toBe('event-a');
  });

  it('preserves loaded, cue, program, staged update, transition, and errors without reconstruction', () => {
    const spec = {
      id: 'spec-1',
      title: 'Score',
      stat: 'score',
      selectors: {},
      filters: {},
      params: {},
      kind: 'stat-tile' as const,
      mode: 'fullscreen' as const,
      options: {}
    };
    const target = {
      targetId: 'target-1',
      targetRevision: 3,
      requestId: 'request-1',
      snapshotId: 'snapshot-1',
      index: 0
    };
    const graphic = {
      target,
      spec,
      frame: {
        schemaVersion: 2 as const,
        kind: 'stat-tile' as const,
        title: 'Score',
        asOfUtc: AT,
        quality: 'complete' as const,
        warnings: [],
        series: [],
        data: {
          kind: 'stat-tile' as const,
          values: [
            {
              id: 'score',
              label: 'Score',
              value: 42,
              format: { style: 'number' as const, scale: 1 }
            }
          ]
        }
      },
      preparedAtUtc: AT
    };
    const state = playbackStateZod.parse({
      ...createEmptyPlaybackState('event-b', AT),
      revision: 9,
      loaded: {
        snapshotId: 'snapshot-1',
        source: { kind: 'timeline', timelineId: 'timeline-1', revision: 2 },
        timelines: [
          {
            schemaVersion: 2,
            revision: 2,
            timelineId: 'timeline-1',
            eventKey: 'event-b',
            name: 'Timeline',
            items: [spec],
            updatedAtUtc: AT
          }
        ],
        items: [
          {
            timelineId: 'timeline-1',
            timelineRevision: 2,
            itemIndex: 0,
            spec
          }
        ],
        index: 0,
        loadedAtUtc: AT,
        values: { featured: 1234 }
      },
      cue: {
        status: 'failed',
        target,
        spec,
        error: {
          code: 'CALCULATION_FAILED',
          message: 'cue failed independently',
          retryable: true
        }
      },
      program: { revision: 8, graphic, takenAtUtc: AT },
      stagedUpdate: {
        status: 'ready',
        destination: 'program',
        origin: target,
        graphic
      },
      transition: {
        revision: 9,
        effectiveAtUtc: AT,
        crossfadeMs: 100,
        exitMs: 200,
        gapMs: 250,
        enterMs: 300
      }
    });
    const authoritative = createPlaybackStateEnvelope('epoch-b', state);
    const store = createStore();
    store.set(eventKeyAtom, 'event-a');
    store.set(playbackEventStoreAtom, {
      'event-b': accept(undefined, authoritative)
    });

    expect(store.get(playbackLoadedForEventAtom('event-b'))?.values).toEqual({
      featured: 1234
    });
    expect(store.get(playbackCueForEventAtom('event-b'))).toEqual(state.cue);
    expect(store.get(playbackCueForEventAtom('event-b'))?.status).toBe(
      'failed'
    );
    expect(store.get(playbackProgramForEventAtom('event-b'))).toEqual(
      state.program
    );
    expect(store.get(playbackStagedUpdateForEventAtom('event-b'))).toEqual(
      state.stagedUpdate
    );
    expect(store.get(playbackTransitionForEventAtom('event-b'))).toEqual(
      state.transition
    );
    if (state.cue.status !== 'failed') throw new Error('expected failed cue');
    expect(store.get(playbackErrorsForEventAtom('event-b'))).toEqual([
      state.cue.error
    ]);
  });
});
