import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  describeCueNotReady,
  graphicIdentifierZod,
  graphicRevisionZod,
  graphicsTargetZod,
  playbackAcknowledgmentZod,
  playbackStateZod,
  preparedGraphicSpecZod,
  type GraphicsError,
  type GraphicsTarget,
  type PlaybackAcknowledgment,
  type PlaybackCommand,
  type PlaybackState
} from '@toa-lib/models/base';
import type { prepareGraphicFrame } from '@toa-lib/models/seasons/stats/presentation';
import {
  GraphicsRepository,
  GraphicsRepositoryError,
  type GraphicsRepositoryOptions
} from '../graphics/GraphicsRepository.js';
import { getPlaybackCoordinator } from '../graphics/PlaybackCoordinatorService.js';
import {
  PlaybackNavigation,
  type LoadEntities,
  type PlaybackNavigationStats
} from '../graphics/PlaybackNavigation.js';
import {
  PlaybackProgram,
  type PlaybackProgramStats
} from '../graphics/PlaybackProgram.js';
import {
  PlaybackRefresh,
  type PlaybackRefreshStats
} from '../graphics/PlaybackRefresh.js';
import { getStatsQueryService } from '../stats/StatsQueryService.js';

/**
 * The live HTTP playback command surface.
 *
 * This is deliberately a SEPARATE controller from `controllers/Graphics.ts`
 * (which owns producer-authored timeline/rundown/queue CRUD) and is
 * registered under its own `/live/*` path segment so the two controllers'
 * routes can never collide, even though both are mounted under the same
 * `/graphics` prefix.
 *
 * Every route here exists so that a Bitfocus Companion button - a single
 * fire-and-forget HTTP request, no browser, no socket client, often GET,
 * always without a JSON body - can drive the live broadcast. See the
 * per-route comments below for the two concessions that follow from that:
 * GET aliases, and server-side target resolution for `take` / `refresh` /
 * `push-update` when the caller does not name one.
 */

export interface GraphicsPlaybackControllerOptions extends GraphicsRepositoryOptions {
  /** Shares the CRUD controller's repository when provided; also becomes the PlaybackCoordinator's storage. */
  repository?: GraphicsRepository;
  /**
   * The stats collaborator shared by all three operation modules. Defaults
   * to the app-scoped `getStatsQueryService(fastify)` singleton (never a
   * second one - see `stats/StatsQueryService.ts`'s own WeakMap). Tests
   * should always supply a fake here: constructing the production default
   * spins up a real `StatsWorkerPool` (worker threads), which route-level
   * tests have no need to pay for.
   */
  stats?: PlaybackNavigationStats & PlaybackProgramStats & PlaybackRefreshStats;
  loadEntities?: LoadEntities;
  prepareFrame?: typeof prepareGraphicFrame;
  now?: () => string;
  newId?: () => string;
  /** Generates a `requestId` for a command whose caller sent none (the Companion path). Defaults to `randomUUID`. Tests may override for determinism. */
  newRequestId?: () => string;
}

const eventParams = z.object({ eventKey: graphicIdentifierZod });
const timelineParams = eventParams.extend({ timelineId: graphicIdentifierZod });
const rundownParams = eventParams.extend({ rundownId: graphicIdentifierZod });
const goParams = eventParams.extend({
  index: z.coerce.number().int().nonnegative()
});
const goQuery = z
  .object({ index: z.coerce.number().int().nonnegative() })
  .strict();
const refreshParams = eventParams.extend({
  destination: z.enum(['cue', 'program'])
});
// `force-active` is a querystring param (not a body field) specifically so a body-less Companion GET can
// drive it just like every other route here - see `quick-cue` below.
const quickCueQuery = z
  .object({ 'force-active': z.enum(['in', 'out']).optional() })
  .strict();

/**
 * Every body below is OPTIONAL so that Companion's body-less GET/POST works
 * unmodified: Fastify only invokes the zod validator against `undefined`
 * when no payload is sent, and `.optional()` here accepts that. The web UI
 * may still POST a full body; when it does, every field on it applies
 * exactly as sent (see `requestId` and target-resolution handling below).
 */
const requestFields = {
  requestId: graphicIdentifierZod.optional(),
  expectedRevision: graphicRevisionZod.optional()
};
// Fastify represents an omitted POST payload as null (not undefined), so
// body-less Companion POSTs must accept both values. GET routes still declare
// no body schema at all, as required by Fastify.
const emptyBody = z
  .object({ ...requestFields })
  .strict()
  .nullish();
// `load` alone additionally accepts `values` - the same variable-name ->
// positive-integer map a rundown entry carries - so a caller (the web
// producer UI's Timeline Queue) can resolve a templated timeline's
// bindings at load time instead of every bound item's cue coming back
// `failed` ("Fill in: <name>").
const loadBody = z
  .object({
    ...requestFields,
    values: z.record(z.string().min(1), z.number().int().positive()).optional()
  })
  .strict()
  .nullish();
/** quick-cue takes the same body shape as `load` - `requestId`/`expectedRevision` apply to its own `load` step; see `quick-cue` below. */
const quickCueBody = loadBody;
const targetBody = z
  .object({ ...requestFields, target: graphicsTargetZod.optional() })
  .strict()
  .nullish();
const cueBody = z
  .object({ ...requestFields, spec: preparedGraphicSpecZod })
  .strict();
/** quick-take is the one command Companion cannot drive body-less: it carries the full graphic spec, so the body is required. */
const quickTakeBody = z
  .object({ ...requestFields, spec: preparedGraphicSpecZod })
  .strict();

const errorEnvelopeZod = z.object({
  error: z.string(),
  code: z.string(),
  message: z.string(),
  retryable: z.boolean()
});
/** A route's response at any given status is EITHER a structured PlaybackAcknowledgment (the normal, expected outcome of a command - success or a business rejection) or this envelope (an unexpected exception, e.g. GraphicsRepositoryError). Both shapes are declared so fastify-type-provider-zod can serialize whichever one a route actually sends. */
const ackOrEnvelope = z.union([playbackAcknowledgmentZod, errorEnvelopeZod]);
const commandResponses = {
  200: playbackAcknowledgmentZod,
  400: ackOrEnvelope,
  404: ackOrEnvelope,
  409: ackOrEnvelope,
  422: ackOrEnvelope,
  500: ackOrEnvelope,
  503: ackOrEnvelope
};
const stateResponses = {
  200: playbackStateZod,
  400: errorEnvelopeZod,
  404: errorEnvelopeZod,
  500: errorEnvelopeZod,
  503: errorEnvelopeZod
};

/** GRAPHICS_PLAYBACK_POLICY has no `restore` step to run here: PlaybackCoordinator.getState/current lazily loads the persisted PlaybackState from GraphicsRepository.loadPlayback on first touch per event, so "the last program is restored exactly" already holds with no eager warm-up (see this task's report). */
const STATUS_BY_CODE: Record<GraphicsError['code'], number> = {
  INVALID_INPUT: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  NOT_READY: 409,
  SUPERSEDED: 409,
  CALCULATION_FAILED: 422,
  PRESENTATION_FAILED: 422,
  CORRUPT_DATA: 409,
  UNAVAILABLE: 503,
  INTERRUPTED: 503
};

export default async function graphicsPlaybackController(
  fastify: FastifyInstance,
  options: GraphicsPlaybackControllerOptions = {}
) {
  // Keep request-schema failures inside the same structured graphics error
  // contract as operation rejections. The API's global error handler emits a
  // different legacy shape which does not satisfy this controller's declared
  // response schemas.
  fastify.setErrorHandler((error, _request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.code(400).send({
        error: 'INVALID_INPUT',
        code: 'INVALID_INPUT',
        message: error.message,
        retryable: false
      });
    }
    return reply.code(503).send({
      error: 'UNAVAILABLE',
      code: 'UNAVAILABLE',
      message: 'Graphics playback is unavailable',
      retryable: true
    });
  });

  const repository = options.repository ?? new GraphicsRepository(options);
  // Same app (same underlying `fastify.server`) as the substrate-only call already made in Server.ts:
  // getPlaybackCoordinator's WeakMap returns the one instance created there. Options are ignored once
  // that instance exists (see PlaybackCoordinatorService.ts), so passing `repository` here only matters
  // the first time this is reached - which, for the real app, was already at startup.
  const coordinator = getPlaybackCoordinator(fastify, { repository });
  // Reuses the same app-scoped singleton the CRUD Stats controller created (getStatsQueryService's own
  // WeakMap) rather than constructing a second StatsQueryService/StatsWorkerPool.
  const stats = options.stats ?? getStatsQueryService(fastify);
  const navigation = new PlaybackNavigation({
    coordinator,
    repository,
    stats,
    loadEntities: options.loadEntities,
    prepareFrame: options.prepareFrame,
    now: options.now,
    newId: options.newId
  });
  const program = new PlaybackProgram({
    coordinator,
    stats,
    loadEntities: options.loadEntities,
    prepareFrame: options.prepareFrame,
    now: options.now
  });
  const refresh = new PlaybackRefresh({
    coordinator,
    stats,
    loadEntities: options.loadEntities,
    prepareFrame: options.prepareFrame,
    now: options.now
  });
  const newRequestId = options.newRequestId ?? randomUUID;

  /**
   * Explicit command-type -> owning-module map (not a try/catch cascade):
   * each module's `handle()` throws for any command type it does not own,
   * so dispatch must route deliberately rather than probe.
   *
   * Direct prepared-spec cue and quick-take share PlaybackProgram's existing
   * server-side preparation path; cue omits only quick-take's atomic program
   * promotion. Saved timeline/rundown navigation remains owned by
   * PlaybackNavigation.
   */
  const moduleForCommand: Partial<
    Record<
      PlaybackCommand['type'],
      {
        handle(
          eventKey: string,
          command: PlaybackCommand
        ): Promise<PlaybackAcknowledgment>;
      }
    >
  > = {
    load: navigation,
    'load-rundown': navigation,
    unload: navigation,
    advance: navigation,
    previous: navigation,
    go: navigation,
    cue: program,
    take: program,
    clear: program,
    'quick-take': program,
    refresh,
    'push-update': refresh
  };
  function dispatch(
    eventKey: string,
    command: PlaybackCommand
  ): Promise<PlaybackAcknowledgment> {
    const owner = moduleForCommand[command.type];
    if (!owner)
      throw new Error(
        `No playback operation module owns command type "${command.type}".`
      );
    return owner.handle(eventKey, command);
  }

  function sendAck(reply: FastifyReply, ack: PlaybackAcknowledgment) {
    return reply.code(ack.ok ? 200 : STATUS_BY_CODE[ack.error.code]).send(ack);
  }
  function sendUnexpected(reply: FastifyReply, error: unknown) {
    const known = error instanceof GraphicsRepositoryError;
    const status = known ? error.statusCode : 503;
    return reply.code(status).send({
      error: known ? error.code : 'UNAVAILABLE',
      code: known ? error.code : 'UNAVAILABLE',
      message: known ? error.message : 'Graphics playback is unavailable',
      retryable: status === 503
    });
  }
  /** Runs a command and sends its acknowledgment (success or business rejection) as the response body, mapped to the right HTTP status. Any exception that escapes dispatch (e.g. an unknown event) is an unexpected failure, not a structured rejection, and gets the envelope shape instead. An optional `transform` may reshape the acknowledgment (e.g. quick-take's own-failure remapping below) before it is sent. */
  async function runCommand(
    reply: FastifyReply,
    eventKey: string,
    command: PlaybackCommand,
    transform?: (ack: PlaybackAcknowledgment) => PlaybackAcknowledgment
  ) {
    try {
      const ack = await dispatch(eventKey, command);
      return sendAck(reply, transform ? transform(ack) : ack);
    } catch (error) {
      return sendUnexpected(reply, error);
    }
  }
  /**
   * PlaybackCoordinator.commit's `ok: true` even when a lane ends 'failed' is the correct, tested contract
   * for the coordinator/module API (see playback-program.test.ts's quick-take failure tests: `ack.ok === true`
   * with `state.cue.status === 'failed'` is durable-write success, not calculation success). But quick-take is
   * Companion's synchronous one-press prepare-and-air command, and its own HTTP contract needs a genuine
   * pass/fail response for ITS OWN preparation outcome. Since `beginPreparation` always freshly overwrites the
   * cue slot for a `lane: 'cue'` ticket, `ack.state.cue` after a quick-take command is always specifically this
   * command's own result - never a stale failure left over from an earlier, unrelated command - so this
   * remapping is safe and reshapes only the wire response, never the coordinator's own acknowledgment contract.
   */
  function remapQuickTakeFailure(
    ack: PlaybackAcknowledgment
  ): PlaybackAcknowledgment {
    if (ack.ok && ack.state.cue.status === 'failed')
      return playbackAcknowledgmentZod.parse({
        ok: false,
        requestId: ack.requestId,
        error: ack.state.cue.error,
        state: ack.state
      });
    return ack;
  }
  function rejectAck(
    requestId: string,
    code: GraphicsError['code'],
    message: string,
    state: PlaybackState
  ): PlaybackAcknowledgment {
    return playbackAcknowledgmentZod.parse({
      ok: false,
      requestId,
      error: { code, message, retryable: false },
      state
    });
  }

  /**
   * Resolves the `GraphicsTarget` a body-less `take` / `refresh` /
   * `push-update` needs. See `target_resolution` in this task's report for
   * the full rationale; in short:
   *   - an explicit `target` in the body (the web UI's path) is used
   *     verbatim and the operation's own strict target check still applies.
   *   - with no explicit target (the Companion path), the target is
   *     resolved from whatever is CURRENTLY live at the relevant source
   *     (`cue`, `program`, or `stagedUpdate`) right now. If that source is
   *     not in the right status, this returns the operation's own NOT_READY
   *     rejection rather than fabricating a target or falling back to
   *     "whatever is on air".
   */
  async function resolveTarget(
    eventKey: string,
    requestId: string,
    explicit: GraphicsTarget | undefined,
    source: 'take-cue' | 'refresh-cue' | 'refresh-program' | 'push-update'
  ): Promise<{ target: GraphicsTarget } | { reject: PlaybackAcknowledgment }> {
    if (explicit) return { target: explicit };
    const state = await coordinator.getState(eventKey);
    if (source === 'take-cue' || source === 'refresh-cue') {
      if (state.cue.status !== 'ready') {
        // Code stays `NOT_READY` regardless of *why* (even a `'failed'` cue)
        // so this auto-resolved-target path rejects identically to the
        // explicit-target path once it reaches `program.take`'s own
        // `NOT_READY` check (see `PlaybackProgram.take`) — only the message
        // gets more specific here.
        const { message } = describeCueNotReady(state.cue);
        return {
          reject: rejectAck(
            requestId,
            'NOT_READY',
            `${message} Nothing to ${source === 'take-cue' ? 'take' : 'refresh'}.`,
            state
          )
        };
      }
      return { target: state.cue.graphic.target };
    }
    if (source === 'refresh-program') {
      if (!state.program)
        return {
          reject: rejectAck(
            requestId,
            'NOT_READY',
            'Nothing is on air to refresh.',
            state
          )
        };
      return { target: state.program.graphic.target };
    }
    // push-update
    if (state.stagedUpdate.status === 'empty')
      return {
        reject: rejectAck(
          requestId,
          'NOT_READY',
          'No staged update to push.',
          state
        )
      };
    return { target: state.stagedUpdate.origin };
  }

  /**
   * "Quick cue": one call that loads a timeline (always resetting it onto
   * its first item, exactly like `load`) and decides FOR the caller whether
   * that also goes to air, based on what's on air right now:
   *  - nothing on air -> load, then take (it becomes the program).
   *  - something already on air -> load only; the existing program is left
   *    exactly as it is, and this timeline just sits ready on the cue,
   *    exactly as `load` alone would leave it.
   *
   * `forceActive` overrides that decision instead of reading it off current
   * state:
   *  - 'in' -> always ends up on air. Whatever was on air is cleared FIRST
   *    (its exit animation plays), then this one is loaded and taken (its
   *    enter animation plays) once its data is ready.
   *  - 'out' -> never ends up on air. Whatever was on air is cleared first,
   *    then this one is loaded and left on the cue - "in the active slot,
   *    on item 1", but off air.
   *
   * `requestId`/`expectedRevision` (from the caller's body, when it sent
   * one) apply ONLY to this call's own `load` step, the same way `cue` and
   * `quick-take` apply theirs to their one primary command. Any `clear`/
   * `take` this needs beyond that gets its own fresh auto-generated id -
   * exactly how the web producer UI's own multi-step flows (e.g.
   * `pullOnDeckEntry`, `handleClearAndAdvanceQueue` in
   * `graphics-controller.tsx`) already compose separate `load`/`take`/
   * `clear` calls, just consolidated here into one request.
   */
  async function quickCue(
    eventKey: string,
    timelineId: string,
    values: Record<string, number> | undefined,
    forceActive: 'in' | 'out' | undefined,
    requestId: string,
    expectedRevision: number | undefined,
    reply: FastifyReply
  ) {
    try {
      const before = await coordinator.getState(eventKey);
      const hadProgram = before.program !== null;

      if (forceActive && hadProgram) {
        const clearAck = await dispatch(eventKey, {
          type: 'clear',
          requestId: newRequestId()
        });
        if (!clearAck.ok) return sendAck(reply, clearAck);
      }

      const loadAck = await dispatch(eventKey, {
        type: 'load',
        requestId,
        expectedRevision,
        timelineId,
        values
      });
      if (!loadAck.ok) return sendAck(reply, loadAck);

      const shouldTake =
        forceActive === 'in' || (forceActive === undefined && !hadProgram);
      if (!shouldTake) return sendAck(reply, loadAck);

      // Mirrors `remapQuickTakeFailure`'s reasoning: a failed cue is a normal, durable `load` outcome
      // (e.g. an unfilled template binding), but quick-cue is ABOUT to take it live, so that failure
      // must surface as this call's own rejection instead of a silent no-op take. `describeCueNotReady`
      // already propagates a `'failed'` cue's own captured error verbatim, so one branch covers both.
      const { cue } = loadAck.state;
      if (cue.status !== 'ready') {
        const { code, message } = describeCueNotReady(cue);
        return sendAck(
          reply,
          rejectAck(
            requestId,
            code,
            `${message} Cannot take it live.`,
            loadAck.state
          )
        );
      }

      const takeAck = await dispatch(eventKey, {
        type: 'take',
        requestId: newRequestId(),
        target: cue.graphic.target
      });
      return sendAck(reply, takeAck);
    } catch (error) {
      return sendUnexpected(reply, error);
    }
  }

  const app = fastify.withTypeProvider<ZodTypeProvider>();

  /**
   * Fastify refuses a `body` schema on a GET route outright (`FST_ERR_ROUTE_BODY_VALIDATION_SCHEMA_NOT_SUPPORTED`),
   * so every "both POST and GET" command below is two separate registrations sharing one handler function:
   * POST validates its (optional) body against the real zod schema; GET declares no body schema at all and
   * the handler always treats a GET's body as absent. That is not a loss for the Companion path this GET
   * alias exists for - Companion's simplest configuration sends no body regardless - and the web UI, which
   * DOES need to send a body (a `target`, a `requestId` for replay safety, a `spec` for quick-take), always
   * uses POST. See `authorization_behavior`/route table in this task's report for the full GET-alias rationale.
   */
  function registerBothMethods<P, B>(
    url: string,
    paramsSchema: z.ZodType<P>,
    bodySchema: z.ZodType<B>,
    handler: (params: P, body: B | undefined, reply: FastifyReply) => unknown
  ) {
    app.post(
      url,
      {
        schema: {
          tags: ['Graphics'],
          params: paramsSchema,
          body: bodySchema,
          response: commandResponses
        }
      },
      (request: FastifyRequest<{ Params: P; Body: B }>, reply) =>
        handler(request.params as P, request.body as B, reply)
    );
    app.get(
      url,
      {
        schema: {
          tags: ['Graphics'],
          params: paramsSchema,
          response: commandResponses
        }
      },
      (request: FastifyRequest<{ Params: P }>, reply) =>
        handler(request.params as P, undefined, reply)
    );
  }

  // --- state (not a command: a plain read, returns the PlaybackState itself so a client always sees the real persisted revision/frame) ---
  app.get(
    '/:eventKey/live',
    {
      schema: {
        tags: ['Graphics'],
        params: eventParams,
        response: stateResponses
      }
    },
    async (request, reply) => {
      try {
        return reply.send(await coordinator.getState(request.params.eventKey));
      } catch (error) {
        return sendUnexpected(reply, error);
      }
    }
  );

  // --- load ---
  registerBothMethods(
    '/:eventKey/live/load/:timelineId',
    timelineParams,
    loadBody,
    (params, body, reply) => {
      const requestId = body?.requestId ?? newRequestId();
      return runCommand(reply, params.eventKey, {
        type: 'load',
        requestId,
        expectedRevision: body?.expectedRevision,
        timelineId: params.timelineId,
        values: body?.values
      });
    }
  );

  // --- load-rundown ---
  registerBothMethods(
    '/:eventKey/live/load-rundown/:rundownId',
    rundownParams,
    emptyBody,
    (params, body, reply) => {
      const requestId = body?.requestId ?? newRequestId();
      return runCommand(reply, params.eventKey, {
        type: 'load-rundown',
        requestId,
        expectedRevision: body?.expectedRevision,
        rundownId: params.rundownId
      });
    }
  );

  // --- unload: durably empties `loaded` back to nothing, the mirror of clear/program below. ---
  registerBothMethods(
    '/:eventKey/live/unload',
    eventParams,
    emptyBody,
    (params, body, reply) => {
      const requestId = body?.requestId ?? newRequestId();
      return runCommand(reply, params.eventKey, {
        type: 'unload',
        requestId,
        expectedRevision: body?.expectedRevision
      });
    }
  );

  // --- cue: POST only because the command carries a full prepared spec. It
  // calculates and durably readies cue without changing loaded or program. ---
  app.post(
    '/:eventKey/live/cue',
    {
      schema: {
        tags: ['Graphics'],
        params: eventParams,
        body: cueBody,
        response: commandResponses
      }
    },
    (request, reply) => {
      const { eventKey } = request.params;
      const requestId = request.body.requestId ?? newRequestId();
      return runCommand(reply, eventKey, {
        type: 'cue',
        requestId,
        expectedRevision: request.body.expectedRevision,
        spec: request.body.spec
      });
    }
  );

  // --- advance / previous / clear ---
  // GET is registered alongside POST for every body-less command on this controller. This is DELIBERATE,
  // requested by the product owner for Bitfocus Companion: Companion's generic HTTP module's simplest
  // configuration is a GET with no body, and the user's own words were "triggered/queried from bitfocus
  // companion". Do not "fix" this into POST-only; the web UI is free to keep using POST (the canonical verb)
  // and both are wired to the exact same handler and the exact same replay-safe requestId handling below.
  for (const type of ['advance', 'previous', 'clear'] as const) {
    registerBothMethods(
      `/:eventKey/live/${type}`,
      eventParams,
      emptyBody,
      (params, body, reply) => {
        const requestId = body?.requestId ?? newRequestId();
        return runCommand(reply, params.eventKey, {
          type,
          requestId,
          expectedRevision: body?.expectedRevision
        });
      }
    );
  }

  // --- go (zero-based - GRAPHICS_PLAYBACK_POLICY.indexing - do not renumber to one-based) ---
  registerBothMethods(
    '/:eventKey/live/go/:index',
    goParams,
    emptyBody,
    (params, body, reply) => {
      const requestId = body?.requestId ?? newRequestId();
      return runCommand(reply, params.eventKey, {
        type: 'go',
        requestId,
        expectedRevision: body?.expectedRevision,
        index: params.index
      });
    }
  );
  // Alternative for a caller that cannot build a path segment: same command, index in the querystring instead.
  // The querystring, unlike the body, is fine on a GET; the body split below exists only because POST can
  // additionally carry `requestId`/`expectedRevision`, exactly like every other route on this controller.
  app.post(
    '/:eventKey/live/go',
    {
      schema: {
        tags: ['Graphics'],
        params: eventParams,
        querystring: goQuery,
        body: emptyBody,
        response: commandResponses
      }
    },
    (
      request: FastifyRequest<{
        Params: z.infer<typeof eventParams>;
        Querystring: z.infer<typeof goQuery>;
        Body: z.infer<typeof emptyBody>;
      }>,
      reply
    ) => {
      const { eventKey } = request.params;
      const requestId = request.body?.requestId ?? newRequestId();
      return runCommand(reply, eventKey, {
        type: 'go',
        requestId,
        expectedRevision: request.body?.expectedRevision,
        index: request.query.index
      });
    }
  );
  app.get(
    '/:eventKey/live/go',
    {
      schema: {
        tags: ['Graphics'],
        params: eventParams,
        querystring: goQuery,
        response: commandResponses
      }
    },
    (
      request: FastifyRequest<{
        Params: z.infer<typeof eventParams>;
        Querystring: z.infer<typeof goQuery>;
      }>,
      reply
    ) => {
      const { eventKey } = request.params;
      const requestId = newRequestId();
      return runCommand(reply, eventKey, {
        type: 'go',
        requestId,
        index: request.query.index
      });
    }
  );

  // --- take ---
  registerBothMethods(
    '/:eventKey/live/take',
    eventParams,
    targetBody,
    async (params, body, reply) => {
      const requestId = body?.requestId ?? newRequestId();
      try {
        const resolved = await resolveTarget(
          params.eventKey,
          requestId,
          body?.target,
          'take-cue'
        );
        if ('reject' in resolved) return sendAck(reply, resolved.reject);
        return runCommand(reply, params.eventKey, {
          type: 'take',
          requestId,
          expectedRevision: body?.expectedRevision,
          target: resolved.target
        });
      } catch (error) {
        return sendUnexpected(reply, error);
      }
    }
  );

  // --- quick-take: POST only. Its body carries the full graphic spec, which a Companion GET (or any GET,
  // by convention) cannot construct, so no GET alias is registered for this one command - see the table
  // in this task's report. ---
  app.post(
    '/:eventKey/live/quick-take',
    {
      schema: {
        tags: ['Graphics'],
        params: eventParams,
        body: quickTakeBody,
        response: commandResponses
      }
    },
    (request, reply) => {
      const { eventKey } = request.params;
      const requestId = request.body.requestId ?? newRequestId();
      return runCommand(
        reply,
        eventKey,
        {
          type: 'quick-take',
          requestId,
          expectedRevision: request.body.expectedRevision,
          spec: request.body.spec
        },
        remapQuickTakeFailure
      );
    }
  );

  // --- quick-cue: load a timeline and, per `quickCue`'s own doc comment, decide (or be told via
  // `?force-active=in|out`) whether it also goes to air. Not built on `registerBothMethods` - unlike
  // every other route above, it needs a `querystring` schema on BOTH methods, which that helper does not
  // parameterize - so POST/GET are registered directly here, the same way the `go` querystring alternative
  // above is.
  app.post(
    '/:eventKey/live/quick-cue/:timelineId',
    {
      schema: {
        tags: ['Graphics'],
        params: timelineParams,
        querystring: quickCueQuery,
        body: quickCueBody,
        response: commandResponses
      }
    },
    (
      request: FastifyRequest<{
        Params: z.infer<typeof timelineParams>;
        Querystring: z.infer<typeof quickCueQuery>;
        Body: z.infer<typeof quickCueBody>;
      }>,
      reply
    ) => {
      const { eventKey, timelineId } = request.params;
      const requestId = request.body?.requestId ?? newRequestId();
      return quickCue(
        eventKey,
        timelineId,
        request.body?.values,
        request.query['force-active'],
        requestId,
        request.body?.expectedRevision,
        reply
      );
    }
  );
  app.get(
    '/:eventKey/live/quick-cue/:timelineId',
    {
      schema: {
        tags: ['Graphics'],
        params: timelineParams,
        querystring: quickCueQuery,
        response: commandResponses
      }
    },
    (
      request: FastifyRequest<{
        Params: z.infer<typeof timelineParams>;
        Querystring: z.infer<typeof quickCueQuery>;
      }>,
      reply
    ) => {
      const { eventKey, timelineId } = request.params;
      return quickCue(
        eventKey,
        timelineId,
        undefined,
        request.query['force-active'],
        newRequestId(),
        undefined,
        reply
      );
    }
  );

  // --- refresh ---
  registerBothMethods(
    '/:eventKey/live/refresh/:destination',
    refreshParams,
    targetBody,
    async (params, body, reply) => {
      const requestId = body?.requestId ?? newRequestId();
      try {
        const resolved = await resolveTarget(
          params.eventKey,
          requestId,
          body?.target,
          params.destination === 'cue' ? 'refresh-cue' : 'refresh-program'
        );
        if ('reject' in resolved) return sendAck(reply, resolved.reject);
        return runCommand(reply, params.eventKey, {
          type: 'refresh',
          requestId,
          expectedRevision: body?.expectedRevision,
          destination: params.destination,
          target: resolved.target
        });
      } catch (error) {
        return sendUnexpected(reply, error);
      }
    }
  );

  // --- push-update ---
  registerBothMethods(
    '/:eventKey/live/push-update',
    eventParams,
    targetBody,
    async (params, body, reply) => {
      const requestId = body?.requestId ?? newRequestId();
      try {
        const resolved = await resolveTarget(
          params.eventKey,
          requestId,
          body?.target,
          'push-update'
        );
        if ('reject' in resolved) return sendAck(reply, resolved.reject);
        return runCommand(reply, params.eventKey, {
          type: 'push-update',
          requestId,
          expectedRevision: body?.expectedRevision,
          target: resolved.target
        });
      } catch (error) {
        return sendUnexpected(reply, error);
      }
    }
  );
}
