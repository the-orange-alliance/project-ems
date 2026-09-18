import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithAnt } from '../../test/render-with-ant.js';
import type { StatCatalogueEntry } from '../../api/use-stats-data.js';
import { QuickStatDrawer } from './quick-stat-drawer.js';

const mocks = vi.hoisted(() => ({ useStatsCatalogue: vi.fn() }));

vi.mock('@ant-design/icons', () => ({
  PlusOutlined: () => <span />,
  SearchOutlined: () => <span />,
  SendOutlined: () => <span />,
  ThunderboltOutlined: () => <span />
}));

vi.mock('../../api/use-stats-data.js', () => ({
  useStatsCatalogue: mocks.useStatsCatalogue
}));

vi.mock('@toa-lib/models/seasons/stats/presentation', () => ({
  presentationFor: () => ({
    family: 'scalar',
    allowedKinds: ['stat-tile'],
    defaultKind: 'stat-tile',
    higherIsBetter: true,
    precision: 0,
    valueLabel: 'Value',
    valuePaths: [],
    unitLabel: 'points'
  })
}));

const entry: StatCatalogueEntry = {
  catalogueId: 'A1',
  name: 'Event Score',
  slug: 'event-score',
  description: 'Authoritative event score',
  family: 'EMS',
  seasonKey: null,
  version: 1,
  scope: 'event',
  units: 'points',
  precision: 0,
  dependencies: [],
  qualityNotes: [],
  supportedSelectors: [],
  paramsSchema: { type: 'object', properties: {} },
  resultSchema: {},
  supportedFilters: []
};

describe('QuickStatDrawer authoritative actions', () => {
  it('distinguishes loading/error/empty and supports retry recovery', () => {
    const mutate = vi.fn();
    const onCue = vi.fn();
    const ui = () => (
      <QuickStatDrawer
        eventKey='event'
        onCue={onCue}
        onAppendToTimeline={vi.fn()}
        onTakeNow={vi.fn()}
      />
    );
    mocks.useStatsCatalogue.mockReturnValue({ mutate });
    const { rerender } = renderWithAnt(ui());
    expect(screen.getByRole('status')).toHaveTextContent('Loading catalogue');
    expect(screen.queryByText('No stats match')).not.toBeInTheDocument();
    mocks.useStatsCatalogue.mockReturnValue({
      data: [entry],
      error: new Error('Connection lost'),
      mutate
    });
    rerender(ui());
    expect(screen.getByRole('alert')).toHaveTextContent('Connection lost');
    expect(screen.queryByText('No stats match')).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Search stats' }), {
      key: 'Enter'
    });
    expect(onCue).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry catalogue' }));
    expect(mutate).toHaveBeenCalledOnce();
    mocks.useStatsCatalogue.mockReturnValue({ data: [], mutate });
    rerender(ui());
    expect(screen.getByText('No stats match')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    mocks.useStatsCatalogue.mockReturnValue({ data: [entry], mutate });
    rerender(ui());
    expect(screen.getByText('Event Score')).toBeInTheDocument();
  });
  it('routes row clicks and Enter to Cue and exposes no browser-local Preview action', async () => {
    mocks.useStatsCatalogue.mockReturnValue({
      data: [entry],
      isLoading: false
    });
    const onCue = vi.fn();

    renderWithAnt(
      <QuickStatDrawer
        eventKey='event-a'
        onCue={onCue}
        onAppendToTimeline={vi.fn()}
        onTakeNow={vi.fn()}
      />
    );

    expect(
      screen.queryByRole('button', { name: /Preview Event Score/i })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Event Score'));
    expect(onCue).toHaveBeenCalledOnce();
    expect(onCue.mock.calls[0][0]).toMatchObject({
      title: 'Event Score',
      stat: 'event-score'
    });

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Search stats' }), {
      key: 'Enter',
      code: 'Enter'
    });
    expect(onCue).toHaveBeenCalledTimes(2);
  }, 20_000);
});
