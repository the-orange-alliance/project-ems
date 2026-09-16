import type { GraphicSpec } from '@toa-lib/models';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { eventKeyAtom } from '../../stores/state/event.js';
import { renderWithJotai } from '../../test/render-with-jotai.js';
import type { StatCatalogueEntry } from '../../api/use-stats-data.js';
import { GraphicInspector } from './graphic-inspector.js';

vi.mock('@toa-lib/models/seasons/stats/presentation', () => ({
  presentationFor: () => ({
    allowedKinds: ['stat-tile', 'bar', 'table'],
    defaultKind: 'stat-tile',
    higherIsBetter: true,
    precision: 1,
    valueLabel: 'Value',
    valuePaths: []
  })
}));
vi.mock('../../api/use-team-data.js', () => ({
  useTeamsForEvent: () => ({ data: [] })
}));

const initialSpec: GraphicSpec = {
  id: 'graphic',
  title: 'Graphic',
  stat: 'score',
  selectors: {},
  filters: {},
  params: {},
  kind: 'stat-tile',
  mode: 'lower-third',
  options: {}
};

const catalogueEntry: StatCatalogueEntry = {
  catalogueId: 'score',
  name: 'Score',
  slug: 'score',
  description: 'Score',
  family: 'EMS',
  seasonKey: null,
  version: 1,
  scope: 'event',
  units: 'pts',
  precision: 0,
  dependencies: [],
  qualityNotes: [],
  supportedSelectors: [],
  paramsSchema: { type: 'object', properties: {} },
  resultSchema: {},
  supportedFilters: []
};

describe('GraphicInspector', () => {
  it('normalizes the mode atomically when graphic kind changes', async () => {
    const changes = vi.fn();
    const Harness = () => {
      const [spec, setSpec] = useState(initialSpec);
      return (
        <>
          <button
            type='button'
            onClick={() => setSpec((current) => ({ ...current, kind: 'bar' }))}
          >
            Change kind
          </button>
          <GraphicInspector
            spec={spec}
            catalogueEntry={catalogueEntry}
            onChange={(next) => {
              changes(next);
              setSpec(next);
            }}
          />
        </>
      );
    };
    renderWithJotai(<Harness />, (store) => store.set(eventKeyAtom, 'event'));
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Change kind' }));

    await waitFor(() =>
      expect(changes).toHaveBeenLastCalledWith(
        expect.objectContaining({ kind: 'bar', mode: 'fullscreen' })
      )
    );
    expect(screen.getByText('Fullscreen')).toBeInTheDocument();
    await user.click(screen.getAllByRole('combobox')[1]);
    expect(screen.queryByRole('option', { name: 'Lower Third' })).toBeNull();
  });

  it('makes table auto-paging an explicit, default-off producer choice', async () => {
    const changes = vi.fn();
    const Harness = () => {
      const [spec, setSpec] = useState<GraphicSpec>({
        ...initialSpec,
        kind: 'table',
        mode: 'fullscreen',
        holdMs: 5000
      });
      return (
        <GraphicInspector
          spec={spec}
          catalogueEntry={catalogueEntry}
          onChange={(next) => {
            changes(next);
            setSpec(next);
          }}
        />
      );
    };
    renderWithJotai(<Harness />, (store) => store.set(eventKeyAtom, 'event'));
    const toggle = screen.getByRole('switch', {
      name: 'Auto-page overflowing rows'
    });
    // A hold duration alone does not opt in.
    expect(toggle).not.toBeChecked();
    expect(screen.getByLabelText('Page dwell (ms)')).toBeDisabled();
    expect(screen.queryByText('Hold (ms)')).toBeNull();

    await userEvent.setup().click(toggle);
    expect(changes).toHaveBeenLastCalledWith(
      expect.objectContaining({ autoPage: true, holdMs: 5000 })
    );
    expect(screen.getByLabelText('Page dwell (ms)')).toBeEnabled();
  });
});
