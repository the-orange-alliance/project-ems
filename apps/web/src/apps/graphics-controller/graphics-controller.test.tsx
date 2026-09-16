import type {
  GraphicSpec,
  PlaybackStateEnvelope,
  RundownEntry,
  ShowAdvanceResult,
  VersionedTimeline
} from '@toa-lib/models';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eventKeyAtom } from '../../stores/state/event.js';
import {
  playbackDeliveryMapAtom,
  playbackEventStoreAtom
} from '../../stores/state/graphics.js';
import { renderWithJotai } from '../../test/render-with-jotai.js';
import { resetPlaybackHydrationRecovery } from 'src/api/playback-hydration-recovery.js';
import { GraphicsController } from './graphics-controller.js';

const mocks = vi.hoisted(() => ({
  authoritativeState: vi.fn(),
  cue: vi.fn(),
  refresh: vi.fn(),
  pushUpdate: vi.fn(),
  clear: vi.fn(),
  load: vi.fn(),
  consume: vi.fn(),
  refreshEntry: vi.fn(),
  save: vi.fn(),
  showSnackbar: vi.fn(),
  showErrorSnackbar: vi.fn(),
  // Mutable so a test can model the orders SWR really delivers in - notably
  // the show arriving before the timelines (F19).
  entries: { current: [] as RundownEntry[] },
  timelines: { current: undefined as VersionedTimeline[] | undefined },
  // The Live tab's DRAFT buffer, as the tests want it staged for each case.
  liveDraft: {
    current: {
      items: null as GraphicSpec[] | null,
      remoteRevision: 3 as number | null,
      isDirty: false,
      saveConflict: false
    }
  },
  // Every prop the (mocked) items panel was last rendered with, so a test can
  // assert what transport state the DRAFT list was allowed to carry.
  panelProps: { current: null as Record<string, unknown> | null }
}));

vi.mock('@ant-design/icons', () => ({
  CloudUploadOutlined: () => <span />,
  LeftOutlined: () => <span />,
  PlayCircleOutlined: () => <span />,
  ReloadOutlined: () => <span />,
  RightOutlined: () => <span />,
  StopOutlined: () => <span />
}));

const rawSpec: GraphicSpec = {
  id: 'graphic-a',
  title: 'Bound graphic',
  stat: 'score',
  selectors: {},
  bindings: { teamKey: 'featured' },
  filters: {},
  params: {},
  kind: 'stat-tile',
  mode: 'lower-third',
  options: {}
};
const resolvedSpec: GraphicSpec = {
  ...rawSpec,
  selectors: { teamKey: 254 },
  bindings: undefined
};
const timeline: VersionedTimeline = {
  schemaVersion: 2,
  revision: 3,
  timelineId: 'timeline-a',
  eventKey: 'event-a',
  name: 'Live timeline',
  variables: [{ name: 'featured', kind: 'team' }],
  items: [rawSpec],
  updatedAtUtc: '2026-09-14T12:00:00.000Z'
};

vi.mock('src/api/use-graphics-data.js', () => ({
  graphicsApi: {
    live: {
      authoritativeState: mocks.authoritativeState,
      cue: mocks.cue,
      refresh: mocks.refresh,
      pushUpdate: mocks.pushUpdate,
      take: vi.fn(),
      quickTake: vi.fn(),
      clear: mocks.clear,
      unload: vi.fn(),
      load: mocks.load,
      advance: vi.fn(),
      previous: vi.fn(),
      replayPreview: vi.fn()
    }
  },
  useTimelines: () => ({ data: mocks.timelines.current }),
  useProducerShow: () => ({ data: null, mutate: vi.fn() }),
  mutateProducerShow: vi.fn()
}));
vi.mock('src/api/use-stats-data.js', () => ({
  useStatsCatalogue: () => ({ data: [] })
}));
vi.mock('src/hooks/use-snackbar.js', () => ({
  useSnackbar: () => ({
    showSnackbar: mocks.showSnackbar,
    showErrorSnackbar: mocks.showErrorSnackbar
  })
}));
// The Live tab's hook is the DRAFT buffer; `mocks.liveDraft` is how a test
// stages "the producer has reordered/deleted rows that are not saved yet".
vi.mock('./use-timeline-editor.js', () => ({
  useTimelineEditor: (_eventKey: string, timelineId: string | null) => {
    const draft = mocks.liveDraft.current;
    return {
      timeline: timelineId ? timeline : null,
      items: timelineId ? (draft.items ?? timeline.items) : [],
      remoteRevision: timelineId ? draft.remoteRevision : null,
      isDirty: draft.isDirty,
      isSaving: false,
      saveConflict: draft.saveConflict,
      save: mocks.save,
      revert: vi.fn(),
      reorder: vi.fn(),
      updateItem: vi.fn(),
      addItem: vi.fn(),
      removeItem: vi.fn(),
      duplicateItem: vi.fn(),
      setVariables: vi.fn()
    };
  }
}));
vi.mock('./use-show-rundown.js', () => ({
  ON_DECK: '#on-deck',
  useShowRundown: () => ({
    entries: mocks.entries.current,
    revision: 4,
    isSaving: false,
    addEntry: vi.fn(),
    removeEntry: vi.fn(),
    updateValues: vi.fn(),
    reorder: vi.fn(),
    consume: mocks.consume,
    pendingEntryIds: []
  })
}));
vi.mock('./use-queue-row-refresh.js', () => ({
  useQueueRowRefresh: () => ({
    refreshEntry: mocks.refreshEntry,
    refreshInfo: {}
  })
}));
vi.mock('./use-timeline-preflight.js', () => ({
  useTimelinePreflight: () => ({ readiness: {}, recheck: vi.fn() })
}));
vi.mock('./rundown-list.js', () => ({ RundownList: () => null }));
vi.mock('./live-monitor.js', () => ({ LiveMonitor: () => null }));
vi.mock('./quick-stat-drawer.js', () => ({ QuickStatDrawer: () => null }));
// Records what the panel was handed and renders only its `header`, which is
// where the Live tab's out-of-sync banner, the authoritative running order and
// the Reload-to-transport action live.
vi.mock('./timeline-items-panel.js', () => ({
  TimelineItemsPanel: (props: Record<string, unknown>) => {
    mocks.panelProps.current = props;
    return <>{props.header as ReactNode}</>;
  }
}));
vi.mock('./timeline-list.js', () => ({ TimelineList: () => null }));
vi.mock('./variable-fill-modal.js', () => ({ VariableFillModal: () => null }));
// Renders the overflow menu inline so a test can press Save without driving
// an antd dropdown - the labels are plain anchors the component builds itself.
vi.mock('src/components/buttons/more-button.js', () => ({
  MoreButton: ({
    menuItems
  }: {
    menuItems: {
      key?: string;
      type?: string;
      label?: ReactNode;
      disabled?: boolean;
    }[];
  }) => (
    <>
      {menuItems.map((item, index) =>
        item.type === 'divider' || item.disabled ? null : (
          <div key={item.key ?? index}>{item.label}</div>
        )
      )}
    </>
  )
}));
vi.mock('src/components/util/two-column-header.js', () => ({
  TwoColumnHeader: ({ left, right }: { left: ReactNode; right: ReactNode }) => (
    <>
      {left}
      {right}
    </>
  )
}));
vi.mock('src/layouts/paper-layout.js', () => ({
  PaperLayout: ({
    children,
    header
  }: {
    children: ReactNode;
    header: ReactNode;
  }) => (
    <>
      {header}
      {children}
    </>
  )
}));

const target = {
  targetId: 'target-a',
  targetRevision: 2,
  requestId: 'cue-a',
  snapshotId: 'snapshot-a',
  index: 0
};
const frame = {
  schemaVersion: 2,
  kind: 'stat-tile',
  title: 'Bound graphic',
  asOfUtc: '2026-09-14T12:00:00.000Z',
  quality: 'complete',
  warnings: [],
  series: [],
  data: { kind: 'stat-tile', values: [] }
};

function envelope(
  overrides: Record<string, unknown> = {}
): PlaybackStateEnvelope {
  return {
    schemaVersion: 1,
    authorityEpoch: 'epoch-a',
    eventKey: 'event-a',
    state: {
      schemaVersion: 2,
      eventKey: 'event-a',
      revision: 4,
      loaded: {
        snapshotId: 'snapshot-a',
        source: { kind: 'timeline', timelineId: 'timeline-a', revision: 3 },
        timelines: [timeline],
        items: [
          {
            timelineId: 'timeline-a',
            timelineRevision: 3,
            itemIndex: 0,
            spec: resolvedSpec
          }
        ],
        index: 0,
        loadedAtUtc: '2026-09-14T12:00:00.000Z',
        values: { featured: 254 }
      },
      cue: { status: 'empty' },
      program: null,
      stagedUpdate: { status: 'empty' },
      transition: null,
      lastCommandId: null,
      updatedAtUtc: '2026-09-14T12:00:00.000Z',
      ...overrides
    }
  } as PlaybackStateEnvelope;
}

/** The Live draft back to "clean, and exactly the loaded revision". */
function resetLiveDraft() {
  mocks.liveDraft.current = {
    items: null,
    remoteRevision: 3,
    isDirty: false,
    saveConflict: false
  };
  mocks.panelProps.current = null;
}

function renderController(authoritative = envelope()) {
  return renderWithJotai(<GraphicsController />, (store) => {
    store.set(eventKeyAtom, 'event-a');
    store.set(playbackEventStoreAtom, {
      'event-a': { envelope: authoritative, retiredAuthorityEpochs: [] }
    });
    store.set(playbackDeliveryMapAtom, {
      'event-a': { phase: 'ready', error: null },
      'event-b': { phase: 'ready', error: null }
    });
  });
}

describe('GraphicsController authoritative controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.entries.current = [];
    mocks.timelines.current = [timeline];
    resetLiveDraft();
  });

  it('uses loaded authoritative values when cueing the Live timeline item', async () => {
    mocks.cue.mockResolvedValue(null);
    renderController();

    fireEvent.click(screen.getByRole('button', { name: 'Cue' }));

    expect(mocks.cue).toHaveBeenCalledWith('event-a', rawSpec, {
      featured: 254
    });
  }, 30_000);

  it('recalculates program and pushes only the authoritative staged origin', async () => {
    mocks.refresh.mockResolvedValue(null);
    mocks.pushUpdate.mockResolvedValue(null);
    renderController(
      envelope({
        cue: {
          status: 'ready',
          graphic: {
            target,
            spec: resolvedSpec,
            frame,
            preparedAtUtc: frame.asOfUtc
          }
        },
        program: {
          revision: 3,
          graphic: {
            target,
            spec: resolvedSpec,
            frame,
            preparedAtUtc: frame.asOfUtc
          },
          takenAtUtc: frame.asOfUtc
        },
        stagedUpdate: {
          status: 'ready',
          destination: 'program',
          origin: target,
          graphic: {
            target: { ...target, targetId: 'refresh-a' },
            spec: resolvedSpec,
            frame,
            preparedAtUtc: frame.asOfUtc
          }
        }
      })
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Recalculate program' })
    );
    expect(mocks.refresh).toHaveBeenCalledWith('event-a', 'program', {
      target
    });

    fireEvent.click(screen.getByRole('button', { name: 'Push' }));
    expect(mocks.pushUpdate).toHaveBeenCalledWith('event-a', { target });
  }, 30_000);

  it('shows authoritative failure and ignores a rejected old-event promise', async () => {
    let rejectCue!: (reason: unknown) => void;
    mocks.cue.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectCue = reject;
      })
    );
    const failed = envelope({
      cue: {
        status: 'failed',
        target,
        spec: resolvedSpec,
        error: {
          code: 'CALCULATION_FAILED',
          message: 'No current data',
          retryable: true
        }
      }
    });
    const { store } = renderController(failed);
    expect(
      screen.getByText('CALCULATION_FAILED: No current data')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cue' }));
    act(() => store.set(eventKeyAtom, 'event-b'));
    await act(async () => {
      rejectCue(new Error('old event failed'));
      await Promise.resolve();
    });
    expect(mocks.showErrorSnackbar).not.toHaveBeenCalled();
  }, 30_000);
});

/**
 * How the producer page advances the show.
 *
 * The three things Task 07 changed here: the idle auto-pull fires ONE atomic
 * advance however many times React invokes the effect (F9); a rejected advance
 * is reported rather than swallowed; and the On Deck warm survives the
 * timelines' SWR response arriving after the show's (F19), which used to skip
 * the warm permanently.
 *
 * Lives in this file rather than its own because the producer page's module
 * graph is mocked here, and two files mocking the same graph do not stay
 * isolated from each other under this project's vitest pool.
 */
const showEntry: RundownEntry = { entryId: 'e1', timelineId: 'timeline-a' };

const loadedAdvance = (): ShowAdvanceResult =>
  ({
    outcome: 'loaded',
    consumedEntryId: 'e1',
    acknowledgment: { ok: true, requestId: 'r', state: {}, replayed: false },
    show: { entries: [] }
  }) as unknown as ShowAdvanceResult;

/** The page with an idle transport - nothing loaded at all, which is what the auto-pull reacts to. */
function renderIdleController(strict = false) {
  const idle = envelope({ loaded: null });
  const ui = strict ? (
    <StrictMode>
      <GraphicsController />
    </StrictMode>
  ) : (
    <GraphicsController />
  );
  return renderWithJotai(ui, (store) => {
    store.set(eventKeyAtom, 'event-a');
    store.set(playbackEventStoreAtom, {
      'event-a': { envelope: idle, retiredAuthorityEpochs: [] }
    });
    store.set(playbackDeliveryMapAtom, {
      'event-a': { phase: 'ready', error: null }
    });
  });
}

describe('GraphicsController show advance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.entries.current = [showEntry];
    mocks.timelines.current = [timeline];
    resetLiveDraft();
    mocks.consume.mockResolvedValue(loadedAdvance());
    mocks.refreshEntry.mockResolvedValue({
      attempted: 1,
      succeeded: 1,
      unavailable: 0,
      failed: 0
    });
  });

  it('pulls the on-deck entry with one atomic advance when the transport is idle', async () => {
    renderIdleController();

    await waitFor(() => expect(mocks.consume).toHaveBeenCalled());
    expect(mocks.consume).toHaveBeenCalledTimes(1);
    // No entry named: the SERVER decides what is on deck at the moment it
    // handles this, so a reorder in flight cannot make the browser consume a
    // position the operator no longer sees.
    expect(mocks.consume).toHaveBeenCalledWith({});
  });

  it('still issues exactly one advance under a StrictMode effect replay', async () => {
    renderIdleController(true);

    await waitFor(() => expect(mocks.consume).toHaveBeenCalled());
    // React invokes the effect twice here; the old code loaded and removed an
    // entry on each pass (F9).
    expect(mocks.consume).toHaveBeenCalledTimes(1);
  });

  it('does not advance while something is already loaded', async () => {
    renderController();

    await waitFor(() => expect(mocks.refreshEntry).toHaveBeenCalled());
    expect(mocks.consume).not.toHaveBeenCalled();
  });

  it('reports a rejected advance with the server’s own reason instead of swallowing it', async () => {
    mocks.consume.mockResolvedValue({
      outcome: 'rejected',
      consumedEntryId: null,
      acknowledgment: {
        ok: false,
        requestId: 'r',
        error: {
          code: 'CONFLICT',
          message:
            'Show revision changed; reload the rundown before advancing.',
          retryable: true
        }
      },
      show: { entries: [showEntry] }
    } as unknown as ShowAdvanceResult);

    renderIdleController();

    await waitFor(() => expect(mocks.showErrorSnackbar).toHaveBeenCalled());
    expect(mocks.showErrorSnackbar).toHaveBeenCalledWith(
      'Error while advancing the show rundown.',
      'Show revision changed; reload the rundown before advancing.'
    );
  });

  it('clears and advances in one command', async () => {
    // Something is already on the transport, so the idle auto-pull stays out
    // of the way and this is the only advance in the test.
    renderController();

    fireEvent.click(
      screen.getByRole('button', { name: /Animate Out and Clear/ })
    );

    await waitFor(() => expect(mocks.consume).toHaveBeenCalled());
    expect(mocks.consume).toHaveBeenCalledWith({ clearFirst: true });
    // The browser no longer composes clear + load/unload itself: one command
    // decides between "load the next entry" and "unload", server-side, from
    // the show as it really is at that moment.
    expect(mocks.clear).not.toHaveBeenCalled();
  });

  describe('On Deck warming', () => {
    it('warms the on-deck entry once its timeline is available', async () => {
      renderIdleController();
      await waitFor(() => expect(mocks.refreshEntry).toHaveBeenCalled());
      expect(mocks.refreshEntry).toHaveBeenCalledWith(
        'event-a',
        showEntry,
        timeline
      );
      expect(mocks.refreshEntry).toHaveBeenCalledTimes(1);
    });

    it('retries when the timelines arrive after the show, rather than skipping the warm forever', async () => {
      // The F19 ordering: the show's SWR response lands first and the
      // timelines are still in flight.
      mocks.timelines.current = undefined;
      const { rerender } = renderIdleController();
      await waitFor(() => expect(mocks.consume).toHaveBeenCalled());
      expect(mocks.refreshEntry).not.toHaveBeenCalled();

      mocks.timelines.current = [timeline];
      rerender(<GraphicsController />);

      await waitFor(() => expect(mocks.refreshEntry).toHaveBeenCalled());
      expect(mocks.refreshEntry).toHaveBeenCalledWith(
        'event-a',
        showEntry,
        timeline
      );
    });

    it('re-warms when the on-deck entry’s timeline is edited under it', async () => {
      const { rerender } = renderIdleController();
      await waitFor(() => expect(mocks.refreshEntry).toHaveBeenCalledTimes(1));

      mocks.timelines.current = [{ ...timeline, revision: 4 }];
      rerender(<GraphicsController />);

      await waitFor(() => expect(mocks.refreshEntry).toHaveBeenCalledTimes(2));
    });

    it('allows a later attempt when the warm reported it never started', async () => {
      // `null` means there was nothing to warm (or one was already running) -
      // recording that as done is what made the old guard permanent.
      mocks.refreshEntry.mockResolvedValueOnce(null);
      const { rerender } = renderIdleController();
      await waitFor(() => expect(mocks.refreshEntry).toHaveBeenCalledTimes(1));

      rerender(<GraphicsController />);

      await waitFor(() => expect(mocks.refreshEntry).toHaveBeenCalledTimes(2));
    });
  });
});

/**
 * Task 08 / F21: the Live tab's editable item list is a DRAFT, and the
 * transport runs the immutable loaded snapshot. These cover the boundary
 * between them - what the draft is allowed to claim about the transport, and
 * the now-explicit Save / Reload-to-transport split.
 */
const item = (id: string, title: string): GraphicSpec => ({
  ...rawSpec,
  id,
  title,
  bindings: undefined
});
const liveItems = [
  item('one', 'Opening stat'),
  item('two', 'Mid-match stat'),
  item('three', 'Closing stat')
];
const liveTimeline: VersionedTimeline = {
  ...timeline,
  items: liveItems
};

/** Three saved items, transport parked on the second. */
function liveEnvelope(
  loadedOverrides: Record<string, unknown> = {}
): PlaybackStateEnvelope {
  return envelope({
    loaded: {
      snapshotId: 'snapshot-a',
      source: { kind: 'timeline', timelineId: 'timeline-a', revision: 3 },
      timelines: [liveTimeline],
      items: liveItems.map((spec, itemIndex) => ({
        timelineId: 'timeline-a',
        timelineRevision: 3,
        itemIndex,
        spec
      })),
      index: 1,
      loadedAtUtc: '2026-09-14T12:00:00.000Z',
      values: { featured: 254 },
      ...loadedOverrides
    }
  });
}

const openLiveTab = () =>
  fireEvent.click(screen.getByRole('tab', { name: 'Live' }));

describe('GraphicsController live draft vs loaded running order', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.entries.current = [];
    mocks.timelines.current = [liveTimeline];
    resetLiveDraft();
    mocks.liveDraft.current.items = liveItems;
    mocks.save.mockResolvedValue(undefined);
    mocks.load.mockResolvedValue(null);
  });

  it('names the loaded target from the snapshot, on every tab', () => {
    renderController(liveEnvelope());
    // Stated before the producer has opened any tab: the transport is on item
    // 2 of 3, and that item is "Mid-match stat".
    expect(screen.getByText(/item 2 of 3: Mid-match stat/)).toBeInTheDocument();
    expect(screen.getByText(/revision 3/)).toBeInTheDocument();
  });

  it('lets a clean draft of the loaded revision carry the live position', () => {
    renderController(liveEnvelope());
    openLiveTab();

    expect(mocks.panelProps.current?.liveIndex).toBe(1);
    expect(mocks.panelProps.current?.readiness).toEqual({});
    expect(
      screen.queryByText('Draft is not the running order')
    ).not.toBeInTheDocument();
  });

  it.each([
    ['reordered', [liveItems[1], liveItems[0], liveItems[2]]],
    ['deleted', [liveItems[1], liveItems[2]]],
    ['inserted', [item('new', 'Inserted stat'), ...liveItems]]
  ])(
    'withholds the live position from a draft with a row %s before the playhead',
    (_label, draftItems) => {
      mocks.liveDraft.current.items = draftItems;
      mocks.liveDraft.current.isDirty = true;
      renderController(liveEnvelope());
      openLiveTab();

      // The F21 bug: index 1 painted onto this list highlights a row the
      // transport would never play, and Prev/Go would air something else.
      expect(mocks.panelProps.current?.liveIndex).toBeNull();
      expect(mocks.panelProps.current?.readiness).toBeUndefined();
      expect(
        screen.getByText('Draft is not the running order')
      ).toBeInTheDocument();
      // The authoritative order is still on screen, and still says the truth.
      expect(
        screen.getByText(/item 2 of 3: Mid-match stat/)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('list', { name: 'Loaded running order' })
      ).toBeInTheDocument();
    }
  );

  it('flags a save the transport has not reloaded yet', () => {
    mocks.liveDraft.current.remoteRevision = 4;
    renderController(liveEnvelope());
    openLiveTab();

    expect(mocks.panelProps.current?.liveIndex).toBeNull();
    expect(screen.getByText(/Saved as revision 4/)).toBeInTheDocument();
  });

  it('saves the live timeline without moving the transport', async () => {
    mocks.liveDraft.current.isDirty = true;
    renderController(liveEnvelope());
    openLiveTab();

    fireEvent.click(screen.getByText(/Save Live Timeline/));

    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    // The old Save chained a `live/load`, which rewound the running order to
    // item 1 mid-show. Saving is now only a save.
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.showSnackbar).toHaveBeenCalledWith(
      expect.stringContaining('Reload to transport')
    );
  });

  it('reloads to the transport only on the confirmed explicit command', async () => {
    mocks.liveDraft.current.remoteRevision = 4;
    renderController(liveEnvelope());
    openLiveTab();

    fireEvent.click(
      screen.getByRole('button', { name: /Reload to transport/ })
    );
    expect(mocks.load).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole('button', { name: 'Reload' }));

    await waitFor(() => expect(mocks.load).toHaveBeenCalled());
    // Carries the snapshot's own resolved values, so template bindings that
    // were already filled in are not dropped by the reload.
    expect(mocks.load).toHaveBeenCalledWith('event-a', 'timeline-a', {
      featured: 254
    });
  });

  it('keeps a failed reload on screen with the transport untouched', async () => {
    mocks.liveDraft.current.remoteRevision = 4;
    mocks.load.mockRejectedValue(new Error('relay unreachable'));
    renderController(liveEnvelope());
    openLiveTab();

    fireEvent.click(
      screen.getByRole('button', { name: /Reload to transport/ })
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Reload' }));

    expect(
      await screen.findByText('Reload to transport failed')
    ).toBeInTheDocument();
    expect(mocks.showErrorSnackbar).toHaveBeenCalled();
    // Still out of sync, still saying so, still naming the real target.
    expect(screen.getByText(/item 2 of 3: Mid-match stat/)).toBeInTheDocument();
  });

  it('refuses to reload one timeline out of a rundown running order', () => {
    mocks.liveDraft.current.remoteRevision = 4;
    renderController(
      liveEnvelope({
        source: { kind: 'rundown', rundownId: 'producer-show', revision: 2 }
      })
    );
    openLiveTab();

    expect(
      screen.getByRole('button', { name: /Reload to transport/ })
    ).toBeDisabled();
  });

  it('surfaces a lost save race without discarding either version', () => {
    mocks.liveDraft.current.isDirty = true;
    mocks.liveDraft.current.saveConflict = true;
    renderController(liveEnvelope());
    openLiveTab();

    expect(
      screen.getByText(/Nothing you changed was written/)
    ).toBeInTheDocument();
    expect(mocks.panelProps.current?.liveIndex).toBeNull();
  });

  it('drops the live position when the event switches under it', async () => {
    const { store } = renderController(liveEnvelope());
    openLiveTab();
    expect(mocks.panelProps.current?.liveIndex).toBe(1);

    await act(async () => {
      store.set(eventKeyAtom, 'event-b');
    });

    // Nothing is loaded for the new event, so there is no position to claim.
    expect(mocks.panelProps.current?.liveIndex).toBeNull();
    expect(screen.getByText(/Nothing loaded/)).toBeInTheDocument();
  });
});

/**
 * A failed hydration used to present as "Authoritative playback state is
 * hydrating." on every disabled transport control - a diagnosis with no
 * action attached, and no way out but a page reload.
 */
describe('GraphicsController hydration failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.entries.current = [];
    mocks.timelines.current = [timeline];
    resetLiveDraft();
    resetPlaybackHydrationRecovery();
  });

  function renderFailed(
    delivery: { phase: string; error: string | null } = {
      phase: 'failed',
      error: 'HTTP_502: The graphics API is not reachable.'
    }
  ) {
    return renderWithJotai(<GraphicsController />, (store) => {
      store.set(eventKeyAtom, 'event-a');
      store.set(playbackEventStoreAtom, {
        'event-a': { envelope: envelope(), retiredAuthorityEpochs: [] }
      });
      store.set(playbackDeliveryMapAtom, {
        'event-a': delivery as never
      });
    });
  }

  it('disables the transport with the upstream reason and an action to take', () => {
    renderFailed();

    const go = screen.getByRole('button', { name: /Animate In/ });
    expect(go).toBeDisabled();
    // The alarm names the real cause rather than "hydrating".
    expect(
      screen.getByText('HTTP_502: The graphics API is not reachable.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Retry hydration/ })
    ).toBeEnabled();
  });

  it('issues exactly one recovery attempt when Retry is pressed twice quickly', async () => {
    // Held open so both presses land while the first read is still in
    // flight, then released so nothing is left pending after the test.
    let settle: (value: PlaybackStateEnvelope) => void = () => {};
    mocks.authoritativeState.mockReturnValue(
      new Promise<PlaybackStateEnvelope>((resolve) => {
        settle = resolve;
      })
    );
    renderFailed();
    const retry = screen.getByRole('button', { name: /Retry hydration/ });

    await act(async () => {
      fireEvent.click(retry);
      fireEvent.click(retry);
    });

    await waitFor(() =>
      expect(mocks.authoritativeState).toHaveBeenCalledTimes(1)
    );
    // The second press joined the first attempt rather than starting another.
    await act(async () => {});
    expect(mocks.authoritativeState).toHaveBeenCalledTimes(1);
    await act(async () => {
      settle(envelope());
    });
  });

  it('re-enables the transport once a retry recovers authoritative state', async () => {
    const recovered = envelope();
    recovered.state.revision = 9;
    mocks.authoritativeState.mockResolvedValue(recovered);
    renderFailed();
    expect(screen.getByRole('button', { name: /Animate In/ })).toBeDisabled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Retry hydration/ }));
    });

    await waitFor(
      () =>
        expect(
          screen.queryByRole('button', { name: /Retry hydration/ })
        ).not.toBeInTheDocument(),
      { timeout: 5000 }
    );
    expect(screen.getByRole('button', { name: /Animate In/ })).toBeEnabled();
  });

  it('keeps the alarm and the transport gate while a recovery is running', () => {
    renderFailed({ phase: 'recovering', error: 'unreachable' });

    expect(screen.getByRole('button', { name: /Animate In/ })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /Retry hydration/ })
    ).toBeInTheDocument();
  });
});
