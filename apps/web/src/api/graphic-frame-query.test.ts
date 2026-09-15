import type { GraphicSpec, VizFrame } from '@toa-lib/models';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryGraphicFrame } from './graphic-frame-query.js';
import type { StatCatalogueEntry } from './use-stats-data.js';

const mocks = vi.hoisted(() => ({ post: vi.fn(), adapt: vi.fn() }));
vi.mock('./http-clients.js', () => ({ localClient: { post: mocks.post } }));
vi.mock('@toa-lib/models/seasons/stats/presentation', () => ({
  prepareGraphicFrame: mocks.adapt
}));
const spec: GraphicSpec = {
  id: 'A',
  title: 'Score',
  stat: 'score',
  kind: 'stat-tile',
  mode: 'fullscreen',
  selectors: {},
  filters: {},
  params: {},
  options: {}
};
const options = {
  refresh: false,
  values: {},
  context: {
    catalogue: [{ slug: 'score', catalogueId: 'A1' } as StatCatalogueEntry],
    teams: [],
    matches: []
  }
};
const payload = {
  result: { status: 'ok', data: [], quality: 'complete', warnings: [] },
  calculatedAsOfUtc: '2026-09-15T00:00:00.000Z',
  latestPlayedMatch: null,
  cache: 'miss',
  cacheAgeMs: 0,
  refreshQueued: false
};
beforeEach(() => {
  mocks.post.mockReset().mockResolvedValue(payload);
  mocks.adapt.mockReset().mockReturnValue({
    kind: 'stat-tile',
    title: 'Score',
    series: [],
    asOfUtc: '2026-09-15T00:00:00.000Z',
    quality: 'complete',
    warnings: [],
    emptyReason: 'No eligible matches'
  } as VizFrame);
});
describe('query decoding and adaptation', () => {
  it.each([
    null,
    {},
    { ...payload, result: { status: 'unexpected' } },
    { ...payload, result: { status: 'insufficient_data' } },
    { ...payload, cacheAgeMs: 'bad' }
  ])('rejects malformed transport payload %s', async (value) => {
    mocks.post.mockResolvedValue(value);
    await expect(
      queryGraphicFrame('event', spec, options)
    ).rejects.toMatchObject({ source: 'query', kind: 'validation' });
    expect(mocks.adapt).not.toHaveBeenCalled();
  });
  it.each(['not_found', 'insufficient_data', 'unavailable'])(
    'decodes HTTP 422 %s as an unavailable outcome',
    async (status) => {
      mocks.post.mockRejectedValue({
        status: 422,
        payload: {
          ...payload,
          result: { status, reason: 'No source data', warnings: [] }
        }
      });
      await expect(
        queryGraphicFrame('event', spec, options)
      ).resolves.toMatchObject({
        ok: false,
        unavailable: { status, reason: 'No source data' }
      });
    }
  );
  it('rejects a malformed 422 payload rather than returning an unexplained unavailable state', async () => {
    mocks.post.mockRejectedValue({ status: 422, payload: { result: {} } });
    await expect(
      queryGraphicFrame('event', spec, options)
    ).rejects.toMatchObject({ source: 'query', kind: 'validation' });
  });
  it('preserves semantic adaptation failures with their source', async () => {
    mocks.adapt.mockImplementation(() => {
      throw new Error('Expected numeric score');
    });
    await expect(
      queryGraphicFrame('event', spec, options)
    ).rejects.toMatchObject({
      source: 'adaptation',
      kind: 'adaptation',
      message: 'Expected numeric score'
    });
  });
  it('preserves valid empty frames as successful results', async () => {
    await expect(
      queryGraphicFrame('event', spec, options)
    ).resolves.toMatchObject({
      ok: true,
      result: { frame: { emptyReason: 'No eligible matches' } }
    });
  });
  it('diagnoses an unknown stat in a loaded empty catalogue', async () => {
    await expect(
      queryGraphicFrame('event', spec, {
        ...options,
        context: { ...options.context, catalogue: [] }
      })
    ).rejects.toMatchObject({ source: 'catalogue', kind: 'validation' });
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
