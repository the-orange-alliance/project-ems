import {
  ApiResponseError,
  CueQueue,
  GraphicSpec,
  LiveGraphicState,
  PlaybackStateEnvelope,
  QueueEntry,
  Timeline,
  VersionedTimeline,
  cueQueueZod,
  liveGraphicStateZod,
  playbackStateEnvelopeZod,
  versionedTimelineZod
} from '@toa-lib/models';
import { HttpClient } from '@toa-lib/client';
import useSWR, { mutate, SWRResponse } from 'swr';
import { localClient } from './http-clients.js';
import { EMSApiErrorSchema } from './http-errors.js';

// The realtime service (Socket.IO + this "live control" REST surface) is a
// separate process/origin from the station API that `localClient` talks to
// (port 8080) - it listens on port 8081 (see `SocketOptions.port` in
// `main.tsx`). Derived the same way `localClient`/`remoteClient` are in
// `http-clients.ts` - from `window.location.hostname`, never a hardcoded
// `localhost` - because at a venue the browser is frequently on a different
// machine than the one running the services.
const realtimeClient = new HttpClient({
  baseUrl: `${window.location.protocol}//${window.location.hostname}:8081`,
  // The relay's error bodies don't match `EMSApiErrorSchema` (its `code` is a
  // playback error CODE string like "CONFLICT", not the number the schema
  // expects), so `errorSchema.safeParse` below always fails and `error` here
  // is really the RAW envelope `{ error, code, message, retryable }` off the
  // wire - `error.message` is the actual "CODE: human-readable reason" the
  // realtime relay built (see `describePlaybackError` in
  // `rooms/Graphics.ts`), and MUST be surfaced verbatim rather than
  // re-wrapped, or a 409 conflict again shows nothing but "409 Conflict".
  getErrorMessage: (error) => {
    if (error instanceof Error) return `${error.name} ${error.message}`;
    const message = (error as { message?: unknown } | undefined)?.message;
    if (typeof message === 'string' && message.length > 0) return message;
    return `Status ${error?.code}: ${error?.message}`;
  },
  errorSchema: EMSApiErrorSchema
});

// Patch body accepted by PATCH /graphics/:eventKey/timelines/:timelineId -
// any subset of the mutable fields, plus `sortOrder`, which lives outside
// the `Timeline` model itself (stored alongside it in the DB row).
export type TimelinePatch = Partial<
  Pick<Timeline, 'name' | 'description' | 'items' | 'published'>
> & { sortOrder?: number };

// `published` is part of the cache key so the unfiltered list (Editor tab,
// Timeline Queue name lookups) and the published-only list (the Timeline
// Queue's "Search timelines to add…" picker) are cached independently.
const timelinesKey = (eventKey: string, published?: boolean) =>
  ['/graphics', eventKey, 'timelines', published] as const;
/** Matches every `timelinesKey(eventKey, ...)` cache entry regardless of its `published` filter - passed to SWR's global `mutate` so a create/update/delete invalidates both variants. */
const isTimelinesKeyFor = (eventKey: string) => (key: unknown) =>
  Array.isArray(key) &&
  key[0] === '/graphics' &&
  key[1] === eventKey &&
  key[2] === 'timelines';

const liveStateKey = (eventKey: string) =>
  ['/graphics', eventKey, 'live'] as const;

const queueKey = (eventKey: string) =>
  ['/graphics', eventKey, 'queue'] as const;

export const graphicsApi = {
  get: {
    // The API's list endpoint returns persisted rows (VersionedTimeline: adds
    // `schemaVersion` + `revision`), not the bare `Timeline` model. `timelineZod`
    // is `.strict()`, so validating against it here rejected every row and the
    // producer saw "No timelines yet". The client needs `revision` anyway - a
    // PATCH/save must send it as `expectedRevision`.
    timelines: (
      eventKey: string,
      published?: boolean
    ): Promise<VersionedTimeline[] | null> =>
      localClient.get<VersionedTimeline[]>(`/graphics/${eventKey}/timelines`, {
        query: published === undefined ? undefined : { published },
        schema: versionedTimelineZod.array()
      })
  },
  create: {
    // The API responds with the persisted row (VersionedTimeline: adds
    // `schemaVersion` + `revision`), not the bare `Timeline` model - same as
    // the list endpoint above. `timelineZod` is `.strict()`, so validating the
    // response against it threw `unrecognized_keys` on those two keys and the
    // create surfaced as a ZodError even though the row was written.
    timeline: async (
      eventKey: string,
      timeline: Omit<Timeline, 'updatedAtUtc'>
    ): Promise<VersionedTimeline | null> => {
      const created = await localClient.post<VersionedTimeline>(
        `/graphics/${eventKey}/timelines`,
        { body: timeline, schema: versionedTimelineZod }
      );
      mutate(isTimelinesKeyFor(eventKey));
      return created;
    }
  },
  update: {
    // Response is a VersionedTimeline, same as `create` above - validate
    // against the versioned schema so the `schemaVersion`/`revision` keys the
    // server always sends back don't trip `.strict()`.
    //
    // `expectedRevision` is optimistic-concurrency control the server
    // REQUIRES (`patchTimeline` in `controllers/Graphics.ts`): it must be the
    // `revision` of the row this edit was based on, and a stale value comes
    // back as 409. Callers read it off the `VersionedTimeline` they render.
    timeline: async (
      eventKey: string,
      timelineId: string,
      patch: TimelinePatch,
      expectedRevision: number
    ): Promise<VersionedTimeline | null> => {
      const updated = await localClient.patch<VersionedTimeline>(
        `/graphics/${eventKey}/timelines/${timelineId}`,
        { body: { ...patch, expectedRevision }, schema: versionedTimelineZod }
      );
      mutate(isTimelinesKeyFor(eventKey));
      return updated;
    }
  },
  delete: {
    // DELETE requires `expectedRevision` too, as a query param here
    // (`revisionQuery` in `controllers/Graphics.ts`) - same optimistic-
    // concurrency contract as PATCH above. Omitting it is a request-
    // validation failure the server currently surfaces as an opaque 500.
    timeline: async (
      eventKey: string,
      timelineId: string,
      expectedRevision: number
    ): Promise<void> => {
      await localClient.delete<Record<string, never>>(
        `/graphics/${eventKey}/timelines/${timelineId}`,
        { query: { expectedRevision } }
      );
      mutate(isTimelinesKeyFor(eventKey));
    }
  },
  queue: {
    get: (eventKey: string): Promise<CueQueue | null> =>
      localClient.get<CueQueue>(`/graphics/${eventKey}/queue`, {
        schema: cueQueueZod
      }),
    put: async (
      eventKey: string,
      entries: QueueEntry[]
    ): Promise<CueQueue | null> => {
      const updated = await localClient.put<CueQueue>(
        `/graphics/${eventKey}/queue`,
        { body: { entries }, schema: cueQueueZod }
      );
      mutate(queueKey(eventKey));
      return updated;
    }
  },
  live: {
    /** Lossless authoritative read. Command methods remain legacy until Task 05. */
    authoritativeState: (
      eventKey: string
    ): Promise<PlaybackStateEnvelope | null> =>
      realtimeClient.get<PlaybackStateEnvelope>(
        `/graphics/${eventKey}/live/state/v1`,
        { schema: playbackStateEnvelopeZod }
      ),
    state: (eventKey: string): Promise<LiveGraphicState | null> =>
      realtimeClient.get<LiveGraphicState>(`/graphics/${eventKey}/live`, {
        schema: liveGraphicStateZod
      }),
    /**
     * Loads a timeline by id and resets to its first item.
     *
     * `values` resolves any of the timeline's items' template bindings (the
     * same variable-name -> positive-integer map a Timeline Queue entry
     * carries) - without it, any bound item's cue comes back `failed`
     * ("Fill in: <name>") the moment the transport reaches it, since the
     * server has nothing to resolve the binding against. Pass a queue
     * entry's own `values` when loading it onto the transport (see
     * `pullOnDeckEntry`/`handleQuickPlayQueueEntry` in
     * `graphics-controller.tsx`).
     */
    load: async (
      eventKey: string,
      timelineId: string,
      values?: Record<string, number>
    ): Promise<LiveGraphicState | null> => {
      const state = await realtimeClient.post<LiveGraphicState>(
        `/graphics/${eventKey}/live/load/${timelineId}`,
        {
          body:
            values && Object.keys(values).length > 0 ? { values } : undefined,
          schema: liveGraphicStateZod
        }
      );
      mutate(liveStateKey(eventKey), state);
      return state;
    },
    /**
     * Durably empties the transport back to nothing-loaded (the mirror of
     * `clear`, but for `loaded` rather than `program`) - used when clearing
     * the air with nothing queued to take its place, so a later idle-queue
     * check sees a genuine "nothing loaded" rather than the just-cleared
     * show lingering as `state.loaded`.
     */
    unload: async (eventKey: string): Promise<LiveGraphicState | null> => {
      const state = await realtimeClient.post<LiveGraphicState>(
        `/graphics/${eventKey}/live/unload`,
        { schema: liveGraphicStateZod }
      );
      mutate(liveStateKey(eventKey), state);
      return state;
    },
    advance: async (eventKey: string): Promise<LiveGraphicState | null> => {
      const state = await realtimeClient.post<LiveGraphicState>(
        `/graphics/${eventKey}/live/advance`,
        { schema: liveGraphicStateZod }
      );
      mutate(liveStateKey(eventKey), state);
      return state;
    },
    previous: async (eventKey: string): Promise<LiveGraphicState | null> => {
      const state = await realtimeClient.post<LiveGraphicState>(
        `/graphics/${eventKey}/live/previous`,
        { schema: liveGraphicStateZod }
      );
      mutate(liveStateKey(eventKey), state);
      return state;
    },
    go: async (
      eventKey: string,
      index: number
    ): Promise<LiveGraphicState | null> => {
      const state = await realtimeClient.post<LiveGraphicState>(
        `/graphics/${eventKey}/live/go/${index}`,
        { schema: liveGraphicStateZod }
      );
      mutate(liveStateKey(eventKey), state);
      return state;
    },
    take: async (eventKey: string): Promise<LiveGraphicState | null> => {
      const state = await realtimeClient.post<LiveGraphicState>(
        `/graphics/${eventKey}/live/take`,
        { schema: liveGraphicStateZod }
      );
      mutate(liveStateKey(eventKey), state);
      return state;
    },
    /** Calculates and takes this exact ad-hoc graphic in one authoritative command. */
    quickTake: async (
      eventKey: string,
      spec: GraphicSpec
    ): Promise<LiveGraphicState | null> => {
      const state = await realtimeClient.post<LiveGraphicState>(
        `/graphics/${eventKey}/live/quick-take`,
        { body: { spec }, schema: liveGraphicStateZod }
      );
      mutate(liveStateKey(eventKey), state);
      return state;
    },
    clear: async (eventKey: string): Promise<LiveGraphicState | null> => {
      const state = await realtimeClient.post<LiveGraphicState>(
        `/graphics/${eventKey}/live/clear`,
        { schema: liveGraphicStateZod }
      );
      mutate(liveStateKey(eventKey), state);
      return state;
    },
    /**
     * Recalculates whatever is currently live at `destination` with fresh
     * data and STAGES it - `cue`/`program` are untouched until `pushUpdate`.
     * Rejects NOT_READY if `destination` isn't `ready`/on-air right now.
     */
    refresh: async (
      eventKey: string,
      destination: 'cue' | 'program'
    ): Promise<LiveGraphicState | null> => {
      const state = await realtimeClient.post<LiveGraphicState>(
        `/graphics/${eventKey}/live/refresh/${destination}`,
        { schema: liveGraphicStateZod }
      );
      mutate(liveStateKey(eventKey), state);
      return state;
    },
    /** Promotes the most recently staged `refresh` result onto whichever of `cue`/`program` it was computed for. Rejects SUPERSEDED if that target has since moved on. */
    pushUpdate: async (eventKey: string): Promise<LiveGraphicState | null> => {
      const state = await realtimeClient.post<LiveGraphicState>(
        `/graphics/${eventKey}/live/push-update`,
        { schema: liveGraphicStateZod }
      );
      mutate(liveStateKey(eventKey), state);
      return state;
    },
    /**
     * Asks every preview (PVW) screen on this event to replay its entrance
     * animation.
     *
     * Unlike every other call in here it returns no `LiveGraphicState` and
     * never touches `liveStateKey` - nothing durable changes and nothing on
     * air moves (see `GraphicsPreviewReplay` in the models package), so
     * there is no state to mutate into the cache. The relay answers with the
     * replay token it broadcast, which is useful only for debugging.
     */
    replayPreview: async (eventKey: string): Promise<void> => {
      await realtimeClient.post(`/graphics/${eventKey}/preview/replay`);
    },
    queueNext: async (eventKey: string): Promise<LiveGraphicState | null> => {
      const state = await realtimeClient.post<LiveGraphicState>(
        `/graphics/${eventKey}/queue/next`,
        { schema: liveGraphicStateZod }
      );
      mutate(liveStateKey(eventKey), state);
      return state;
    },
    queueGo: async (
      eventKey: string,
      index: number
    ): Promise<LiveGraphicState | null> => {
      const state = await realtimeClient.post<LiveGraphicState>(
        `/graphics/${eventKey}/queue/go/${index}`,
        { schema: liveGraphicStateZod }
      );
      mutate(liveStateKey(eventKey), state);
      return state;
    }
  }
};

/**
 * Lists an event's timelines. `published` is omitted by default (every
 * timeline, for the Editor tab and for resolving Timeline Queue entries'
 * names regardless of their publish state) - pass `true` for the "Search
 * timelines to add…" picker, which must only surface published ones. The
 * two variants are cached under separate keys (see `timelinesKey`) but
 * `graphicsApi.create/update/delete.timeline` invalidate both together.
 */
export const useTimelines = (
  eventKey: string | null | undefined,
  published?: boolean
): SWRResponse<VersionedTimeline[], ApiResponseError> =>
  useSWR<
    VersionedTimeline[],
    ApiResponseError,
    readonly [string, string, string, boolean | undefined] | null
  >(
    eventKey ? timelinesKey(eventKey, published) : null,
    ([, eKey, , pub]) =>
      graphicsApi.get.timelines(eKey, pub).then((res) => res ?? []),
    { revalidateOnFocus: false }
  );

export const useLiveGraphicState = (
  eventKey: string | null | undefined
): SWRResponse<LiveGraphicState | null, ApiResponseError> =>
  useSWR<
    LiveGraphicState | null,
    ApiResponseError,
    readonly [string, string, string] | null
  >(
    eventKey ? liveStateKey(eventKey) : null,
    ([, eKey]) => graphicsApi.live.state(eKey),
    {
      revalidateOnFocus: false,
      // The socket layer (see `useGraphicsStateEvent` / `liveGraphicStateAtom`)
      // already pushes live state into a jotai atom on every change, so this
      // hook must NOT poll - that would be redundant with, and could race,
      // the socket-pushed state. This is for the initial load and for an
      // explicit `mutate()`-triggered refresh only.
      refreshInterval: 0
    }
  );

export const useCueQueue = (
  eventKey: string | null | undefined
): SWRResponse<CueQueue | null, ApiResponseError> =>
  useSWR<
    CueQueue | null,
    ApiResponseError,
    readonly [string, string, string] | null
  >(
    eventKey ? queueKey(eventKey) : null,
    ([, eKey]) => graphicsApi.queue.get(eKey),
    {
      revalidateOnFocus: false,
      // Same rationale as `useLiveGraphicState` above: the socket layer
      // already pushes live state, so this hook must NOT poll - that would
      // be redundant with, and could race, the socket-pushed state. This is
      // for the initial load and for an explicit `mutate()`-triggered
      // refresh only.
      refreshInterval: 0
    }
  );
