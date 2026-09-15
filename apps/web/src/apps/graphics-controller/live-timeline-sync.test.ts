import type { GraphicSpec, LoadedGraphicsSnapshot } from '@toa-lib/models';
import { describe, expect, it } from 'vitest';
import {
  describeDraftSync,
  readLoadedRunningOrder,
  type DraftSyncInput
} from './live-timeline-sync.js';

const spec = (id: string, title = id): GraphicSpec => ({
  id,
  title,
  stat: 'score',
  selectors: {},
  filters: {},
  params: {},
  kind: 'stat-tile',
  mode: 'lower-third',
  options: {}
});

/** Three saved items, transport parked on the middle one. */
const snapshot = (
  overrides: Partial<LoadedGraphicsSnapshot> = {}
): LoadedGraphicsSnapshot =>
  ({
    snapshotId: 'snapshot-a',
    source: { kind: 'timeline', timelineId: 'timeline-a', revision: 3 },
    timelines: [
      {
        schemaVersion: 2,
        revision: 3,
        timelineId: 'timeline-a',
        eventKey: 'event-a',
        name: 'Live timeline',
        items: [spec('a'), spec('b'), spec('c')],
        updatedAtUtc: '2026-09-14T12:00:00.000Z'
      }
    ],
    items: [spec('a'), spec('b'), spec('c')].map((s, itemIndex) => ({
      timelineId: 'timeline-a',
      timelineRevision: 3,
      itemIndex,
      spec: s
    })),
    index: 1,
    loadedAtUtc: '2026-09-14T12:00:00.000Z',
    ...overrides
  }) as LoadedGraphicsSnapshot;

const sync = (overrides: Partial<DraftSyncInput> = {}) =>
  describeDraftSync({
    running: readLoadedRunningOrder(snapshot()),
    remoteRevision: 3,
    draftItems: [spec('a'), spec('b'), spec('c')],
    isDirty: false,
    saveConflict: false,
    ...overrides
  });

describe('readLoadedRunningOrder', () => {
  it('projects the snapshot, not any editable copy of the timeline', () => {
    const running = readLoadedRunningOrder(snapshot());
    expect(running?.rows.map((row) => row.title)).toEqual(['a', 'b', 'c']);
    expect(running?.index).toBe(1);
    expect(running?.current?.title).toBe('b');
    expect(running?.timelineName).toBe('Live timeline');
    expect(running?.timelineRevision).toBe(3);
    expect(running?.rows.filter((row) => row.isPlayhead)).toHaveLength(1);
  });

  it('is null when nothing is loaded', () => {
    expect(readLoadedRunningOrder(null)).toBeNull();
  });
});

describe('describeDraftSync', () => {
  it('lets a clean draft of the loaded revision carry transport state', () => {
    const state = sync();
    expect(state.status).toBe('in-sync');
    expect(state.describesLoaded).toBe(true);
    expect(state.message).toBeNull();
    // Reloading what is already loaded would rewind the transport for nothing.
    expect(state.reloadReason).toBeDefined();
  });

  it.each([
    ['reorder before the playhead', [spec('b'), spec('a'), spec('c')]],
    ['delete before the playhead', [spec('b'), spec('c')]],
    ['insert before the playhead', [spec('z'), spec('a'), spec('b'), spec('c')]]
  ])('refuses transport state after a %s', (_label, draftItems) => {
    const state = sync({ draftItems, isDirty: true });
    expect(state.status).toBe('unsaved-edits');
    // The F21 failure: this is what used to leave the "LIVE" highlight sitting
    // on a row the transport would never play.
    expect(state.describesLoaded).toBe(false);
    expect(state.message).toContain('Unsaved edits');
  });

  it('refuses transport state for an in-place title or spec edit', () => {
    const state = sync({
      draftItems: [spec('a'), spec('b', 'Renamed'), spec('c')],
      isDirty: true
    });
    expect(state.describesLoaded).toBe(false);
    expect(state.status).toBe('unsaved-edits');
  });

  it('reports saved-but-not-reloaded once the saved revision moves ahead', () => {
    const state = sync({ remoteRevision: 4 });
    expect(state.status).toBe('saved-not-reloaded');
    expect(state.describesLoaded).toBe(false);
    expect(state.message).toContain('revision 4');
    expect(state.message).toContain('revision 3');
    expect(state.reloadReason).toBeUndefined();
  });

  it('reports divergence when edits are staged on an already-newer revision', () => {
    const state = sync({
      remoteRevision: 5,
      isDirty: true,
      draftItems: [spec('a'), spec('c')]
    });
    expect(state.status).toBe('diverged');
    expect(state.severity).toBe('error');
    expect(state.describesLoaded).toBe(false);
  });

  it('reports a lost save race as its own recoverable state', () => {
    const state = sync({ isDirty: true, saveConflict: true });
    expect(state.status).toBe('save-conflict');
    expect(state.severity).toBe('error');
    expect(state.message).toContain('Nothing you changed was written');
  });

  it('catches an ordering that drifted without a revision change', () => {
    const state = sync({ draftItems: [spec('c'), spec('b'), spec('a')] });
    expect(state.status).toBe('saved-not-reloaded');
    expect(state.describesLoaded).toBe(false);
  });

  it('treats an unloaded transport as having nothing to disagree with', () => {
    const state = sync({ running: null, isDirty: true });
    expect(state.status).toBe('no-timeline');
    expect(state.describesLoaded).toBe(false);
    expect(state.message).toBeNull();
    expect(state.reloadReason).toBeDefined();
  });

  it('refuses to reload one timeline out of a rundown running order', () => {
    const rundown = readLoadedRunningOrder(
      snapshot({
        source: { kind: 'rundown', rundownId: 'producer-show', revision: 2 }
      })
    );
    const state = describeDraftSync({
      running: rundown,
      remoteRevision: 4,
      draftItems: [spec('a'), spec('b'), spec('c')],
      isDirty: false,
      saveConflict: false
    });
    expect(state.status).toBe('saved-not-reloaded');
    // Loading the timeline would drop every other timeline in the rundown.
    expect(state.reloadReason).toContain('rundown');
  });

  it('compares only the loaded rows belonging to the edited timeline', () => {
    const mixed = readLoadedRunningOrder(
      snapshot({
        items: [
          {
            timelineId: 'timeline-other',
            timelineRevision: 9,
            itemIndex: 0,
            spec: spec('x')
          },
          ...[spec('a'), spec('b')].map((s, itemIndex) => ({
            timelineId: 'timeline-a',
            timelineRevision: 3,
            itemIndex,
            spec: s
          }))
        ],
        index: 2
      } as Partial<LoadedGraphicsSnapshot>)
    );
    const state = describeDraftSync({
      running: mixed,
      remoteRevision: 3,
      draftItems: [spec('a'), spec('b')],
      isDirty: false,
      saveConflict: false
    });
    expect(state.describesLoaded).toBe(true);
  });
});
