import type { TestContext } from 'node:test';
import {
  presentationFrameZod,
  type GraphicSpec,
  type PlaybackState
} from '@toa-lib/models/base';
import type {
  prepareGraphicFrame,
  StatResult
} from '@toa-lib/models/seasons/stats/presentation';
import graphicsPlaybackController from '../controllers/GraphicsPlayback.js';
import type { GraphicsRepository } from '../graphics/GraphicsRepository.js';
import { getPlaybackCoordinator } from '../graphics/PlaybackCoordinatorService.js';
import type { PlaybackCoordinator } from '../graphics/PlaybackCoordinator.js';
// Resolves the realtime package's ALREADY-COMPILED output through its declared dependency entry point, not
// its .ts source: a source import here would pull realtime's entire src tree into this package's own tsc
// compilation, corrupting rootDir inference for the WHOLE api build (it would silently nest every emitted
// path under build/api/src/..., breaking package.json's "main"/"start"/"dist" scripts, the Dockerfile's build
// sanity check, and scripts/backend_entrypoint.sh, which all assume the untouched build/Server.js layout).
// Going through "realtime/rooms/Graphics" rather than a relative ../../../realtime/build path means the
// dependency is declared in package.json, ordered by turbo (api#test/^build) and by this package's own `test`
// script (which builds realtime first), and typed against realtime's emitted .d.ts instead of suppressed.
import Graphics from 'realtime/rooms/Graphics';
import {
  graphicsFixture,
  sampleGraphic as supportSampleGraphic
} from './graphics-test-support.js';

const NOW = '2026-01-01T00:00:00.000Z';
const API_BASE_URL = 'http://127.0.0.1:9999';

export type HarnessOptions = {
  statsOverrides?: Partial<Pick<FakeStats, 'queryImpl' | 'catalogueEntries'>>;
  publish?: (eventKey: string, state: PlaybackState) => Promise<void> | void;
};

export type GraphicsBroadcastHarness = {
  app: Awaited<ReturnType<typeof graphicsFixture>>['app'];
  repository: GraphicsRepository;
  stats: FakeStats;
  realtime: Graphics;
  commands: ReturnType<typeof apiCommands>;
  coordinator: PlaybackCoordinator;
  apiBaseUrl: string;
};

class FakeStats {
  catalogueEntries: { slug: string; catalogueId: string }[] = [
    { slug: 'score', catalogueId: 'CAT-SCORE' }
  ];
  queryCount = 0;
  queryFreshCount = 0;
  queryImpl: (
    eventKey: string,
    input: unknown
  ) => Promise<{ result: StatResult; calculatedAsOfUtc: string }> =
    async () => ({
      result: {
        status: 'ok',
        data: { value: 42 },
        quality: 'complete',
        warnings: []
      },
      calculatedAsOfUtc: NOW
    });

  async catalogue(): Promise<{ slug: string; catalogueId: string }[]> {
    return this.catalogueEntries;
  }

  async query(eventKey: string, input: unknown) {
    this.queryCount++;
    return this.queryImpl(eventKey, input);
  }

  /** This fake has no cache, so a cue's ready query is always a calculation; counted with queryFresh. */
  async queryReady(eventKey: string, input: unknown) {
    return this.queryFresh(eventKey, input);
  }

  async queryFresh(eventKey: string, input: unknown) {
    this.queryFreshCount++;
    return this.queryImpl(eventKey, input);
  }
}

function fakeFrame(spec: GraphicSpec, asOfUtc: string) {
  return presentationFrameZod.parse({
    schemaVersion: 2,
    kind: spec.kind,
    title: spec.title,
    asOfUtc,
    quality: 'complete',
    warnings: [],
    series: [],
    data: {
      kind: 'stat-tile',
      values: [
        {
          id: 'v1',
          label: 'Score',
          value: 42,
          format: { style: 'number', scale: 1 }
        }
      ]
    }
  });
}

const fakePrepareFrame: typeof prepareGraphicFrame = (result, spec, ctx) => {
  if (result.status !== 'ok')
    throw new Error('prepareFrame must never be called with a non-ok result');
  return fakeFrame(spec, ctx.asOfUtc);
};

export async function createGraphicsBroadcastReliabilityHarness(
  t: TestContext,
  options: HarnessOptions = {}
): Promise<GraphicsBroadcastHarness> {
  const fixture = await graphicsFixture(t);
  const { app } = fixture;
  const { repository } = fixture;
  const stats = new FakeStats();
  const originalApiBaseUrl = process.env.GRAPHICS_API_BASE_URL;

  if (options.statsOverrides) Object.assign(stats, options.statsOverrides);

  process.env.GRAPHICS_API_BASE_URL = API_BASE_URL;

  let coordinator: PlaybackCoordinator | undefined;
  if (options.publish) {
    coordinator = getPlaybackCoordinator(app, {
      repository,
      publish: options.publish,
      publicationRetryBaseMs: 5,
      publicationRetryMaxMs: 10
    });
  }

  await app.register(graphicsPlaybackController, {
    prefix: '/graphics',
    repository,
    stats,
    prepareFrame: fakePrepareFrame,
    now: () => NOW,
    newRequestId: () => `test-request-${Math.random().toString(16).slice(2)}`
  });
  coordinator ??= getPlaybackCoordinator(app, { repository });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit
  ) => {
    const inputUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const requestUrl = inputUrl.startsWith(API_BASE_URL)
      ? inputUrl.slice(API_BASE_URL.length) || '/'
      : inputUrl;
    const method = (
      init?.method ?? (input instanceof Request ? input.method : 'GET')
    ).toUpperCase();

    let payload: unknown = undefined;
    if (init?.body && typeof init.body === 'string') {
      try {
        payload = JSON.parse(init.body);
      } catch {
        payload = init.body;
      }
    }

    const response = await app.inject({
      method: method as any,
      url: requestUrl,
      payload: payload as any,
      headers: init?.headers as any
    });

    return {
      ok: response.statusCode >= 200 && response.statusCode < 400,
      status: response.statusCode,
      async json() { return response.json(); },
      async text() {
        return response.payload;
      }
    } as Response;
  }) as typeof fetch;

  const realtime = new Graphics({} as any);

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalApiBaseUrl === undefined) {
      delete process.env.GRAPHICS_API_BASE_URL;
    } else {
      process.env.GRAPHICS_API_BASE_URL = originalApiBaseUrl;
    }
  });

  return {
    app,
    repository,
    stats,
    realtime,
    commands: apiCommands(app),
    coordinator,
    apiBaseUrl: API_BASE_URL
  };
}

export async function seedTimeline(
  repository: GraphicsRepository,
  eventKey: string,
  timelineId: string,
  itemIds: string[]
) {
  await repository.createTimeline(eventKey, {
    timelineId,
    name: `Timeline ${timelineId}`,
    items: itemIds.map((id) => supportSampleGraphic(id))
  });
}

export async function seedRundown(
  repository: GraphicsRepository,
  eventKey: string,
  rundownId: string,
  entries: Array<{ timelineId: string; values?: Record<string, number> }>
) {
  await repository.createRundown(eventKey, {
    rundownId,
    name: `Rundown ${rundownId}`,
    entries: entries.map((entry, index) => ({
      entryId: `entry-${index}`,
      timelineId: entry.timelineId,
      values: entry.values ?? {}
    }))
  });
}

export { supportSampleGraphic as sampleGraphic };

/** Test convenience only: exercises the supported API ingress and returns exact state. */
function apiCommands(app: GraphicsBroadcastHarness['app']) {
  async function command(eventKey: string, path: string, payload?: unknown): Promise<PlaybackState> {
    const response = await app.inject({ method: 'POST', url: '/graphics/' + eventKey + '/live/' + path, payload: payload as any });
    if (response.statusCode !== 200) throw new Error(response.payload);
    return response.json().state;
  }
  return {
    load: (event: string, timeline: string) => command(event, 'load/' + timeline),
    take: (event: string) => command(event, 'take'),
    advance: (event: string) => command(event, 'advance'),
    clear: (event: string) => command(event, 'clear'),
    quickTake: (event: string, spec: GraphicSpec, _throwOnError?: boolean) => command(event, 'quick-take', { spec }),
    getState: async (event: string): Promise<PlaybackState> => (await app.inject('/graphics/' + event + '/live')).json()
  };
}
