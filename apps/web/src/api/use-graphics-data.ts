import {
  ApiResponseError,
  GraphicSpec,
  GraphicsTarget,
  PlaybackAcknowledgment,
  PlaybackDeliveryHealth,
  PlaybackStateEnvelope,
  PRODUCER_SHOW_RUNDOWN_ID,
  Rundown,
  ShowAdvanceResult,
  Timeline,
  VersionedTimeline,
  graphicSpecZod,
  graphicsTargetZod,
  playbackAcknowledgmentZod,
  playbackDeliveryHealthZod,
  playbackStateEnvelopeZod,
  rundownZod,
  showAdvanceResultZod,
  variableValuesZod,
  versionedTimelineZod
} from '@toa-lib/models';
import { HttpClient } from '@toa-lib/client';
import useSWR, { mutate, SWRResponse } from 'swr';
import { localClient } from './http-clients.js';
import { EMSApiErrorSchema } from './http-errors.js';
import { requireCollection } from './load-state.js';
import { recordPlaybackDelivery } from './playback-delivery.js';

// Realtime owns only off-air preview replay; all playback reads/mutations use API.
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

// API commands preserve structured playback error messages.
const playbackClient = new HttpClient({
  baseUrl: `${window.location.protocol}//${window.location.hostname}:8080`,
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

const showKey = (eventKey: string) => ['/graphics', eventKey, 'show'] as const;

export interface PlaybackCommandOptions {
  requestId?: string;
  target?: GraphicsTarget;
  /** The playback revision the caller formed this command against. The server rejects the command if state has moved on since. */
  expectedRevision?: number;
}

/**
 * Every playback command goes through here so its acknowledgment's `delivery`
 * reaches the producer's delivery indicator - that is how delivery failures
 * surface without anything polling.
 */
async function postAck(
  url: string,
  options: { body: unknown; schema: typeof playbackAcknowledgmentZod }
): Promise<PlaybackAcknowledgment | null> {
  const ack = await playbackClient.post<PlaybackAcknowledgment>(url, options);
  recordPlaybackDelivery(ack?.delivery);
  return ack;
}

const newPlaybackRequestId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** Every producer command carries a stable identity; explicit targets are validated before transport. */
function commandBody(options: PlaybackCommandOptions = {}) {
  return {
    requestId: options.requestId ?? newPlaybackRequestId(),
    ...(options.target
      ? { target: graphicsTargetZod.parse(options.target) }
      : {}),
    ...(options.expectedRevision !== undefined
      ? { expectedRevision: options.expectedRevision }
      : {})
  };
}

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
  /**
   * The producer's ordered show - one durable, revisioned `Rundown` per event
   * (`PRODUCER_SHOW_RUNDOWN_ID`), replacing the old whole-array `CueQueue`
   * PUT. `get` creates the empty document server-side on first read, so
   * `patch` always has a real `expectedRevision` to write against; a `patch`
   * whose revision is stale 409s rather than overwriting a concurrent edit.
   */
  show: {
    get: (eventKey: string): Promise<Rundown | null> =>
      localClient.get<Rundown>(`/graphics/${eventKey}/show`, {
        schema: rundownZod
      }),
    // Every write below returns the document the server committed, and applies
    // it to the SWR cache HERE, once (`applyProducerShow`). Callers must not
    // follow a write with a `mutate()` of their own: that second revalidation
    // raced the first, and whichever response landed last won - including a
    // stale one (F22).
    patch: async (
      eventKey: string,
      entries: Rundown['entries'],
      expectedRevision: number
    ): Promise<Rundown | null> => {
      const updated = await localClient.patch<Rundown>(
        `/graphics/${eventKey}/rundowns/${PRODUCER_SHOW_RUNDOWN_ID}`,
        { body: { entries, expectedRevision }, schema: rundownZod }
      );
      if (updated) applyProducerShow(eventKey, updated);
      return updated;
    },
    /**
     * The atomic ordered-show operation: consume one entry, load it onto the
     * transport, and optionally clear what was on air first / take it to air
     * after - as ONE server command with one request id.
     *
     * This replaces the browser sequences that used to spell the same thing
     * out as `live.load` + a rundown removal (+ `clear`/`take`), which were
     * neither atomic nor replay-safe: a failure between them left an entry
     * both loaded and still queued, and a retry or a StrictMode effect replay
     * consumed a second entry. Retrying with the SAME `requestId` now returns
     * the original outcome and consumes nothing more.
     *
     * The response carries the authoritative show, which is applied to the
     * cache here - including when the command was rejected, which is exactly
     * when the caller most needs to see what the server really holds. That is
     * why this route answers 200 with `outcome: 'rejected'` rather than a
     * throwing status: an HTTP error would discard that document.
     */
    advance: async (
      eventKey: string,
      options: {
        requestId: string;
        /** Omit to consume whatever is on deck (position 1). */
        entryId?: string;
        /** The show revision this action was decided from, when the caller has one. */
        expectedShowRevision?: number;
        take?: boolean;
        clearFirst?: boolean;
      }
    ): Promise<ShowAdvanceResult | null> => {
      const result = await playbackClient.post<ShowAdvanceResult>(
        `/graphics/${eventKey}/live/show/advance`,
        { body: options, schema: showAdvanceResultZod }
      );
      if (result) {
        recordPlaybackDelivery(result.acknowledgment.delivery);
        applyProducerShow(eventKey, result.show);
      }
      return result;
    }
  },
  live: {
    /** Lossless authoritative read from the API. */
    authoritativeState: (
      eventKey: string
    ): Promise<PlaybackStateEnvelope | null> =>
      playbackClient.get<PlaybackStateEnvelope>(
        `/graphics/${eventKey}/live/state/v1`,
        { schema: playbackStateEnvelopeZod }
      ),
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
    ): Promise<PlaybackAcknowledgment | null> => {
      const state = await postAck(
        `/graphics/${eventKey}/live/load/${timelineId}`,
        {
          body:
            { ...commandBody(), ...(values ? { values } : {}) },
          schema: playbackAcknowledgmentZod
        }
      );
      return state;
    },
    advance: async (eventKey: string): Promise<PlaybackAcknowledgment | null> => {
      const state = await postAck(
        `/graphics/${eventKey}/live/advance`,
        { body: commandBody(), schema: playbackAcknowledgmentZod }
      );
      return state;
    },
    previous: async (eventKey: string): Promise<PlaybackAcknowledgment | null> => {
      const state = await postAck(
        `/graphics/${eventKey}/live/previous`,
        { body: commandBody(), schema: playbackAcknowledgmentZod }
      );
      return state;
    },
    take: async (
      eventKey: string,
      options?: PlaybackCommandOptions
    ): Promise<PlaybackAcknowledgment | null> =>
      postAck(
        `/graphics/${eventKey}/live/take`,
        { body: commandBody(options), schema: playbackAcknowledgmentZod }
      ),
    /** Calculates and readies this exact ad-hoc graphic without changing program. */
    cue: async (
      eventKey: string,
      spec: GraphicSpec,
      values: Record<string, number> = {},
      options?: PlaybackCommandOptions
    ): Promise<PlaybackAcknowledgment | null> =>
      postAck(
        `/graphics/${eventKey}/live/cue`,
        {
          body: {
            ...commandBody(options),
            spec: graphicSpecZod.parse(spec),
            values: variableValuesZod.parse(values)
          },
          schema: playbackAcknowledgmentZod
        }
      ),
    /** Calculates and takes this exact ad-hoc graphic in one authoritative command. */
    quickTake: async (
      eventKey: string,
      spec: GraphicSpec,
      values: Record<string, number> = {},
      options?: PlaybackCommandOptions
    ): Promise<PlaybackAcknowledgment | null> =>
      postAck(
        `/graphics/${eventKey}/live/quick-take`,
        {
          body: {
            ...commandBody(options),
            spec: graphicSpecZod.parse(spec),
            values: variableValuesZod.parse(values)
          },
          schema: playbackAcknowledgmentZod
        }
      ),
    clear: async (eventKey: string): Promise<PlaybackAcknowledgment | null> => {
      const state = await postAck(
        `/graphics/${eventKey}/live/clear`,
        { body: commandBody(), schema: playbackAcknowledgmentZod }
      );
      return state;
    },
    /**
     * Recalculates whatever is currently live at `destination` with fresh
     * data and STAGES it - `cue`/`program` are untouched until `pushUpdate`.
     * Rejects NOT_READY if `destination` isn't `ready`/on-air right now.
     */
    refresh: async (
      eventKey: string,
      destination: 'cue' | 'program',
      options?: PlaybackCommandOptions
    ): Promise<PlaybackAcknowledgment | null> =>
      postAck(
        `/graphics/${eventKey}/live/refresh/${destination}`,
        { body: commandBody(options), schema: playbackAcknowledgmentZod }
      ),
    /**
     * Recalculates whatever is currently live at `destination` and puts THAT
     * recalculation onto it, as one server command.
     *
     * Use this - never `refresh` followed by `pushUpdate` - whenever the
     * caller already knows it wants the result live. The two-call form has a
     * window in which a staged update from somewhere else is what the push
     * promotes, which on `program` means an unrequested on-air change; this
     * command stages and promotes in one durable commit and is structurally
     * incapable of promoting anything but its own result.
     */
    refreshAndPush: async (
      eventKey: string,
      destination: 'cue' | 'program',
      options?: PlaybackCommandOptions
    ): Promise<PlaybackAcknowledgment | null> =>
      postAck(
        `/graphics/${eventKey}/live/refresh/${destination}/push`,
        { body: commandBody(options), schema: playbackAcknowledgmentZod }
      ),
    /**
     * Promotes a staged `refresh` result onto the lane it was computed for.
     *
     * `destination` names the staged update the caller means, and is REQUIRED
     * to promote onto `program`: `target` alone cannot distinguish a cue
     * update from a program update (after a take both lanes share one target),
     * so an unqualified push could otherwise put someone else's staged program
     * update on air. Pass `expectedRevision` too - then the push applies to
     * exactly the state the caller was looking at, or is rejected.
     *
     * Rejects SUPERSEDED if what is staged is not what the caller named.
     */
    pushUpdate: async (
      eventKey: string,
      destination: 'cue' | 'program',
      options?: PlaybackCommandOptions
    ): Promise<PlaybackAcknowledgment | null> =>
      postAck(
        `/graphics/${eventKey}/live/push-update/${destination}`,
        { body: commandBody(options), schema: playbackAcknowledgmentZod }
      ),
    /**
     * Explicit, operator-triggered read of delivery health (the same object
     * each command acknowledgment carries). One request per call; never polled.
     */
    publicationHealth: async (
      eventKey: string
    ): Promise<PlaybackDeliveryHealth | null> => {
      const health = await playbackClient.get<PlaybackDeliveryHealth>(
        `/graphics/${eventKey}/live/publication-health`,
        { schema: playbackDeliveryHealthZod }
      );
      recordPlaybackDelivery(health);
      return health;
    },
    /**
     * Re-sends the latest committed playback state now, clearing a parked
     * publication. Answers with delivery health after that attempt.
     */
    retryPublication: async (
      eventKey: string
    ): Promise<PlaybackDeliveryHealth | null> => {
      const health = await playbackClient.post<PlaybackDeliveryHealth>(
        `/graphics/${eventKey}/live/publication-retry`,
        { schema: playbackDeliveryHealthZod }
      );
      recordPlaybackDelivery(health);
      return health;
    },
    /**
     * Asks every preview (PVW) screen on this event to replay its entrance
     * animation.
     *
     * This returns no playback acknowledgment and
     * never touches playback state - nothing durable changes and nothing on
     * air moves (see `GraphicsPreviewReplay` in the models package). The relay answers with the
     * replay token it broadcast, which is useful only for debugging.
     */
    replayPreview: async (eventKey: string): Promise<void> => {
      await realtimeClient.post(`/graphics/${eventKey}/preview/replay`);
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
      graphicsApi.get
        .timelines(eKey, pub)
        .then((res) => requireCollection(res, 'timelines')),
    { revalidateOnFocus: false }
  );

/**
 * The event's producer-show rundown. `graphicsApi.show.get` creates the empty
 * document on first read, so this resolves to a real revisioned `Rundown` for
 * every event rather than to "not saved yet".
 */
export const useProducerShow = (
  eventKey: string | null | undefined
): SWRResponse<Rundown | null, ApiResponseError> =>
  useSWR<
    Rundown | null,
    ApiResponseError,
    readonly [string, string, string] | null
  >(
    eventKey ? showKey(eventKey) : null,
    ([, eKey]) => graphicsApi.show.get(eKey),
    {
      revalidateOnFocus: false,
      // Show CRUD owns this cache; playback state is delivered separately
      // through the authoritative event-scoped Jotai store.
      refreshInterval: 0
    }
  );

/**
 * Re-reads the producer-show cache from the server.
 *
 * Only for recovering after a write FAILED, where the client has no committed
 * document to trust. A successful write never needs this - it already returned
 * the authoritative document, which `applyProducerShow` below writes straight
 * into the cache.
 */
export const mutateProducerShow = (eventKey: string) =>
  mutate(showKey(eventKey));

/**
 * Publishes a document the server just returned as the cached show, with no
 * revalidation - the single-source SWR update this module's writes use.
 */
export const applyProducerShow = (eventKey: string, show: Rundown) =>
  mutate(showKey(eventKey), show, false);
