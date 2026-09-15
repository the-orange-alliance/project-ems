import { AudienceScreens, Displays, type PlaybackStateEnvelope } from '@toa-lib/models';
import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithJotai } from '../../../test/render-with-jotai.js';
import { eventKeyAtom } from '../../../stores/state/event.js';
import { playbackEventStoreAtom } from '../../../stores/state/graphics.js';
import { DisplaySwitcher } from './display-switcher.js';

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(`pin=${AudienceScreens.STATS}`)]
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
  StatsGraphicPreviewDisplay: () => null
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
});
