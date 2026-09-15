import type { VersionedTimeline } from '@toa-lib/models';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithAnt } from '../../test/render-with-ant.js';
import { TimelineList } from './timeline-list.js';

const mocks = vi.hoisted(() => ({
  createTimeline: vi.fn(),
  showErrorSnackbar: vi.fn(),
  useTimelines: vi.fn()
}));

vi.mock('@ant-design/icons', () => ({
  CopyOutlined: () => <span />,
  DeleteOutlined: () => <span />,
  EditOutlined: () => <span />,
  PlusOutlined: () => <span />
}));

vi.mock('src/api/use-graphics-data.js', () => ({
  graphicsApi: {
    create: { timeline: mocks.createTimeline },
    delete: { timeline: vi.fn() },
    update: { timeline: vi.fn() }
  },
  useTimelines: mocks.useTimelines
}));

vi.mock('src/hooks/use-snackbar.js', () => ({
  useSnackbar: () => ({ showErrorSnackbar: mocks.showErrorSnackbar })
}));

describe('TimelineList', () => {
  it('distinguishes loading/decode failure from a valid empty list and retries', () => {
    const mutate = vi.fn();
    const ui = () => (
      <TimelineList eventKey='event' selectedId={null} onSelect={vi.fn()} />
    );
    mocks.useTimelines.mockReturnValue({ mutate });
    const { rerender } = renderWithAnt(ui());
    expect(screen.getByRole('status')).toHaveTextContent('Loading timelines');
    expect(screen.queryByText('No timelines yet')).not.toBeInTheDocument();
    mocks.useTimelines.mockReturnValue({
      error: new SyntaxError('Invalid response'),
      mutate
    });
    rerender(ui());
    expect(screen.getByRole('alert')).toHaveTextContent(
      'validation: Invalid response'
    );
    expect(screen.queryByText('No timelines yet')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry timelines' }));
    expect(mutate).toHaveBeenCalledOnce();
    mocks.useTimelines.mockReturnValue({ data: [], mutate });
    rerender(ui());
    expect(screen.getByText('No timelines yet')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('retains variable declarations when duplicating a templated timeline', async () => {
    const variables = [{ name: 'team', kind: 'team' as const, label: 'Team' }];
    const timeline: VersionedTimeline = {
      schemaVersion: 2,
      timelineId: 'template',
      eventKey: 'event',
      name: 'Template',
      description: 'Templated show block',
      variables,
      items: [],
      revision: 3,
      updatedAtUtc: '2026-09-14T00:00:00.000Z'
    };
    mocks.useTimelines.mockReturnValue({ data: [timeline], isLoading: false });
    mocks.createTimeline.mockResolvedValue({
      ...timeline,
      timelineId: 'copy',
      name: 'Template (copy)'
    });

    renderWithAnt(
      <TimelineList eventKey='event' selectedId={null} onSelect={vi.fn()} />
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Duplicate Template' })
    );

    await waitFor(() => expect(mocks.createTimeline).toHaveBeenCalledOnce());
    expect(mocks.createTimeline).toHaveBeenCalledWith(
      'event',
      expect.objectContaining({ variables })
    );
  });
});
