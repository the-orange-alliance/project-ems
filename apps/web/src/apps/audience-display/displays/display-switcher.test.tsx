import { AudienceScreens, Displays, MatchState, type GraphicsTarget, type PlaybackStateEnvelope } from '@toa-lib/models';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithJotai } from '../../../test/render-with-jotai.js';
import {
  eventKeyAtom,
  matchAtom,
  matchOccurringRanksAtom
} from '../../../stores/state/event.js';
import { matchStateAtom } from '../../../stores/state/match.js';
import {
  playbackDeliveryMapAtom,
  playbackEventStoreAtom
} from '../../../stores/state/graphics.js';
import { DisplaySwitcher } from './display-switcher.js';
import { DEFAULT_LAYOUT } from './layout-mode.js';
import { expectResolvableSizingChain } from '../../../test/sizing-contract.js';

const mocks = vi.hoisted(() => ({
  pin: null as string | null,
  // null = `?layout=` absent entirely; '' = present but empty (`?layout=`).
  layout: null as string | null,
  // null = the season-display branch stays unreachable, as it was before the
  // layout tests below existed.
  seasonKey: null as string | null
}));
vi.mock('react-router-dom', () => ({
  useSearchParams: () => {
    const params = new URLSearchParams();
    if (mocks.pin !== null) params.set('pin', mocks.pin);
    if (mocks.layout !== null) params.set('layout', mocks.layout);
    return [params];
  }
}));
vi.mock('src/api/use-event-data.js', () => ({
  useEvent: () => ({
    data: mocks.seasonKey === null ? null : { seasonKey: mocks.seasonKey }
  })
}));
vi.mock('src/stores/hooks/use-event-state.js', () => ({
  useEventState: () => ({ state: { remote: { teams: [] } } })
}));
// Identifiable per-slot stubs rather than the real season displays: those pull
// antd, emotion, SWR and `useAllianceMember`, and the contract under test here
// is the wrapper/locator chain around them, not their internals.
const SLOTS = [
  'matchPreview',
  'matchPreviewStream',
  'matchPlay',
  'matchPlayStream',
  'matchPlayMin',
  'matchProduction',
  'matchResults',
  'matchResultsStream'
] as const;
vi.mock('./displays.js', () => ({
  getDisplays: () =>
    mocks.seasonKey === null
      ? null
      : Object.fromEntries(
          SLOTS.map((slot) => [
            slot,
            () => <div data-testid={slot} />
          ])
        )
}));
// NOTE: `src/components/animations/index.js` is deliberately NOT mocked. The
// real wrappers have to render for the sizing-contract assertions below to
// mean anything - mocking them away is precisely why the 0x0 regression went
// unnoticed.

vi.mock('./graphics/stats-graphic-display.js', () => ({
  StatsGraphicDisplay: ({ spec }: { spec: { id?: string } | null }) => (
    <div data-testid='program-spec'>{spec?.id ?? 'none'}</div>
  )
}));
vi.mock('./graphics/stats-graphic-preview-display.js', () => ({
  StatsGraphicPreviewDisplay: ({ spec, programSpec }: { spec: { id: string } | null; programSpec: { id: string } | null }) => (
    <div data-testid='preview-spec'>{spec?.id ?? 'none'} / {programSpec?.id ?? 'none'}</div>
  )
}));

beforeEach(() => {
  mocks.pin = null;
  mocks.layout = null;
  mocks.seasonKey = null;
});

function record(eventKey: string, specId: string) {
  return {
    envelope: {
      schemaVersion: 1,
      authorityEpoch: `epoch-${eventKey}`,
      eventKey,
      state: {
        eventKey,
        revision: 1,
        program: { graphic: { spec: { id: specId }, frame: {} } }
      }
    } as unknown as PlaybackStateEnvelope,
    retiredAuthorityEpochs: []
  };
}

describe('DisplaySwitcher authoritative event pinning', () => {
  it('renders program for its route event, not the globally selected event', () => {
    mocks.pin = AudienceScreens.STATS;
    renderWithJotai(
      <DisplaySwitcher id={Displays.BLANK} eventKey='event-b' />,
      (store) => {
        store.set(eventKeyAtom, 'event-a');
        store.set(playbackEventStoreAtom, {
          'event-a': record('event-a', 'program-a'),
          'event-b': record('event-b', 'program-b')
        });
      }
    );

    expect(screen.getByTestId('program-spec')).toHaveTextContent('program-b');
  });

  it('renders nothing on PGM when hydration failed - no spinner, no error, no placeholder', () => {
    mocks.pin = AudienceScreens.STATS;
    renderWithJotai(
      <DisplaySwitcher id={Displays.BLANK} eventKey='event-b' />,
      (store) => {
        store.set(eventKeyAtom, 'event-b');
        // A named, operator-visible failure on the producer must stay
        // invisible here: PGM is fail-closed and reads only the envelope.
        store.set(playbackDeliveryMapAtom, {
          'event-b': {
            phase: 'failed',
            error: 'HTTP_502: The graphics API is not reachable.'
          }
        });
      }
    );

    expect(screen.getByTestId('program-spec')).toHaveTextContent('none');
    expect(screen.queryByText(/not reachable/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Retry hydration/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders PVW from the route event snapshot and retains its program anchor after scrubbing', () => {
    mocks.pin = AudienceScreens.STATS_PREVIEW;
    const eventB = record('event-b', 'program-b');
    eventB.envelope.state.loaded = {
      snapshotId: 'show-b', index: 2,
      items: [{ spec: { id: 'program-b' } }, { spec: { id: 'next-b' } }, { spec: { id: 'scrubbed-b' } }]
    } as unknown as NonNullable<PlaybackStateEnvelope['state']['loaded']>;
    eventB.envelope.state.program!.graphic.target = {
      snapshotId: 'show-b', index: 0
    } as GraphicsTarget;
    const view = renderWithJotai(<DisplaySwitcher id={Displays.BLANK} eventKey='event-b' />, store => {
      store.set(eventKeyAtom, 'event-a');
      store.set(playbackEventStoreAtom, { 'event-a': record('event-a', 'program-a'), 'event-b': eventB });
    });
    expect(screen.getByTestId('preview-spec')).toHaveTextContent('next-b / program-b');
    view.rerender(<DisplaySwitcher id={Displays.BLANK} eventKey='unknown-event' />);
    expect(screen.getByTestId('preview-spec')).toHaveTextContent('none / none');
  });
});

/**
 * The layout pipeline. Nothing covered `?layout=` before: every test above
 * pins a stats screen and returns before the layout JSX is reached, and
 * `getDisplays` returned null so the branch was unreachable regardless. That
 * gap is why a change to the animation wrappers' sizing basis could blank
 * every stream/min screen without a single test failing.
 */
describe('DisplaySwitcher layouts', () => {
  const MATCH = {
    eventKey: 'FGC_2026-FGC-FGC1',
    tournamentKey: 'q',
    id: 1,
    name: 'Qualification 1',
    participants: []
  };

  function renderLayout(layout: string | null, id: Displays) {
    mocks.layout = layout;
    mocks.seasonKey = 'fgc_2026';
    return renderWithJotai(
      <DisplaySwitcher id={id} eventKey={MATCH.eventKey} />,
      (store) => {
        store.set(matchAtom, MATCH);
        store.set(matchOccurringRanksAtom, []);
      }
    );
  }

  /** Slots that are MOUNTED (not necessarily visible) for a given layout. */
  const mounted: [string, Displays, string[]][] = [
    ['fsf', Displays.MATCH_PREVIEW, ['matchPreview', 'matchPlayStream', 'matchResults']],
    ['fff', Displays.MATCH_PREVIEW, ['matchPreview', 'matchPlay', 'matchResults']],
    ['sss', Displays.MATCH_PREVIEW, ['matchPreviewStream', 'matchPlayStream', 'matchResultsStream']],
    // `m` is the in-match slot only, so it belongs at index 1 - `ssm` would
    // put it in the results slot, which does not implement it.
    ['sms', Displays.MATCH_START, ['matchPreviewStream', 'matchPlayMin', 'matchResultsStream']],
    ['ssm', Displays.MATCH_START, ['matchPreviewStream', 'matchPlayStream']],
    ['ooo', Displays.MATCH_START, []],
    ['rss', Displays.MATCH_PREVIEW, ['matchPlayStream', 'matchResultsStream']]
  ];

  it.each(mounted)('mounts the expected slots for layout=%s', (layout, id, slots) => {
    renderLayout(layout, id);
    for (const slot of SLOTS) {
      if (slots.includes(slot)) {
        expect(screen.getByTestId(slot)).toBeInTheDocument();
      } else {
        expect(screen.queryByTestId(slot)).not.toBeInTheDocument();
      }
    }
  });

  // The regression itself. Every mounted screen must sit inside a locator that
  // resolves a real box, or its percentage-sized wrapper collapses to 0x0 and
  // `overflow: hidden` clips it off the wall.
  it.each(mounted)('resolves a sizing chain for every slot in layout=%s', (layout, id, slots) => {
    const { container } = renderLayout(layout, id);
    for (const slot of slots) {
      expectResolvableSizingChain(screen.getByTestId(slot), container);
    }
  });

  it.each([
    ['absent', null],
    ['bare ?layout=', ''],
    ['unknown characters', 'zzz']
  ])('falls back to %s -> the default layout', (_label, layout) => {
    renderLayout(layout, Displays.MATCH_PREVIEW);
    // `fsf`: full preview, stream in-match, full results.
    expect(DEFAULT_LAYOUT).toBe('fsf');
    expect(screen.getByTestId('matchPreview')).toBeInTheDocument();
    expect(screen.getByTestId('matchPlayStream')).toBeInTheDocument();
    expect(screen.getByTestId('matchResults')).toBeInTheDocument();
  });

  it('hides the preview when slot 0 is off, without unmounting it', () => {
    // `o` promises "hides the step entirely" (audience.md). The screen stays
    // MOUNTED on purpose - it doubles as the post-match holding screen for
    // full in-match layouts - so the assertion is on visibility, not presence.
    const { container } = renderLayout('ofs', Displays.MATCH_PREVIEW);
    const preview = screen.getByTestId('matchPreview');
    expect(preview).toBeInTheDocument();
    expect((preview.parentElement as HTMLElement).style.opacity).toBe('0');
    expectResolvableSizingChain(preview, container);
  });

  it('still shows the full preview as the post-match holding screen', () => {
    // matchState defaults to MATCH_NOT_SELECTED, so drive the real trigger:
    // MATCH_COMPLETE sits between MATCH_IN_PROGRESS and RESULTS_POSTED.
    mocks.layout = 'ofs';
    mocks.seasonKey = 'fgc_2026';
    renderWithJotai(
      <DisplaySwitcher id={Displays.MATCH_START} eventKey={MATCH.eventKey} />,
      (store) => {
        store.set(matchAtom, MATCH);
        store.set(matchOccurringRanksAtom, []);
        store.set(matchStateAtom, MatchState.MATCH_COMPLETE);
      }
    );
    const preview = screen.getByTestId('matchPreview');
    expect((preview.parentElement as HTMLElement).style.opacity).toBe('1');
  });
});
