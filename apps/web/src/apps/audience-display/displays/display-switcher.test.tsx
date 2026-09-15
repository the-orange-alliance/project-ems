import { AudienceScreens, Displays, type GraphicsTarget, type PlaybackStateEnvelope } from '@toa-lib/models';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithJotai } from '../../../test/render-with-jotai.js';
import { eventKeyAtom } from '../../../stores/state/event.js';
import { playbackEventStoreAtom } from '../../../stores/state/graphics.js';
import { DisplaySwitcher } from './display-switcher.js';

const mocks = vi.hoisted(() => ({ pin: 'stats' }));
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(`pin=${mocks.pin}`)]
}));
vi.mock('src/api/use-event-data.js', () => ({
  useEvent: () => ({ data: null })
}));
vi.mock('src/stores/hooks/use-event-state.js', () => ({
  useEventState: () => ({ state: { remote: { teams: [] } } })
}));
vi.mock('./displays.js', () => ({ getDisplays: () => null }));
vi.mock('src/components/animations/index.js', () => ({
  FadeInOut: ({ children }: { children: ReactNode }) => children,
  SlideInBottom: ({ children }: { children: ReactNode }) => children
}));
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
