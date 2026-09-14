import type { VersionedTimeline } from '@toa-lib/models';
import { screen, waitFor } from '@testing-library/react';
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
