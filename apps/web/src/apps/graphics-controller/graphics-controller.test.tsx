import type {
  GraphicSpec,
  PlaybackStateEnvelope,
  VersionedTimeline
} from '@toa-lib/models';
import { act, fireEvent, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eventKeyAtom } from '../../stores/state/event.js';
import {
  playbackDeliveryMapAtom,
  playbackEventStoreAtom
} from '../../stores/state/graphics.js';
import { renderWithJotai } from '../../test/render-with-jotai.js';
import { GraphicsController } from './graphics-controller.js';

const mocks = vi.hoisted(() => ({
  cue: vi.fn(),
  refresh: vi.fn(),
  pushUpdate: vi.fn(),
  showErrorSnackbar: vi.fn()
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
      cue: mocks.cue,
      refresh: mocks.refresh,
      pushUpdate: mocks.pushUpdate,
      take: vi.fn(),
      quickTake: vi.fn(),
      clear: vi.fn(),
      unload: vi.fn(),
      load: vi.fn(),
      advance: vi.fn(),
      previous: vi.fn(),
      replayPreview: vi.fn()
    }
  },
  useTimelines: () => ({ data: [timeline] }),
  useProducerShow: () => ({ data: null, mutate: vi.fn() }),
  mutateProducerShow: vi.fn()
}));
vi.mock('src/api/use-stats-data.js', () => ({
  useStatsCatalogue: () => ({ data: [] })
}));
vi.mock('src/hooks/use-snackbar.js', () => ({
  useSnackbar: () => ({
    showSnackbar: vi.fn(),
    showErrorSnackbar: mocks.showErrorSnackbar
  })
}));
vi.mock('./use-timeline-editor.js', () => ({
  useTimelineEditor: (_eventKey: string, timelineId: string | null) => ({
    timeline: timelineId ? timeline : null,
    items: timelineId ? timeline.items : [],
    isDirty: false,
    isSaving: false,
    save: vi.fn(),
    revert: vi.fn(),
    reorder: vi.fn(),
    updateItem: vi.fn(),
    addItem: vi.fn(),
    removeItem: vi.fn(),
    duplicateItem: vi.fn(),
    setVariables: vi.fn()
  })
}));
vi.mock('./use-show-rundown.js', () => ({
  useShowRundown: () => ({
    entries: [],
    revision: 0,
    isSaving: false,
    addEntry: vi.fn(),
    removeEntry: vi.fn(),
    updateValues: vi.fn(),
    reorder: vi.fn()
  })
}));
vi.mock('./use-queue-row-refresh.js', () => ({
  useQueueRowRefresh: () => ({ refreshEntry: vi.fn(), refreshInfo: {} })
}));
vi.mock('./use-timeline-preflight.js', () => ({
  useTimelinePreflight: () => ({ readiness: {} })
}));
vi.mock('./rundown-list.js', () => ({ RundownList: () => null }));
vi.mock('./live-monitor.js', () => ({ LiveMonitor: () => null }));
vi.mock('./quick-stat-drawer.js', () => ({ QuickStatDrawer: () => null }));
vi.mock('./timeline-items-panel.js', () => ({
  TimelineItemsPanel: () => null
}));
vi.mock('./timeline-list.js', () => ({ TimelineList: () => null }));
vi.mock('./variable-fill-modal.js', () => ({ VariableFillModal: () => null }));
vi.mock('src/components/buttons/more-button.js', () => ({
  MoreButton: () => null
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
  beforeEach(() => vi.clearAllMocks());

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

    fireEvent.click(screen.getByRole('button', { name: 'Recalculate program' }));
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
