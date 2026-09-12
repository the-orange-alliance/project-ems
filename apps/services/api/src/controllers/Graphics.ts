import {
  graphicIdentifierZod,
  graphicRevisionZod,
  versionedTimelineZod,
  rundownZod,
  cueQueueZod,
  queueEntryZod
} from '@toa-lib/models';
import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  GraphicsRepository,
  GraphicsRepositoryError,
  type GraphicsRepositoryOptions
} from '../graphics/GraphicsRepository.js';
import { rundownBaseZod } from '@toa-lib/models/base';

export interface GraphicsControllerOptions extends GraphicsRepositoryOptions {
  repository?: GraphicsRepository;
}
const eventParams = z.object({ eventKey: graphicIdentifierZod });
const timelineParams = eventParams.extend({ timelineId: graphicIdentifierZod });
const rundownParams = eventParams.extend({ rundownId: graphicIdentifierZod });
const revisionQuery = z
  .object({ expectedRevision: z.coerce.number().int().nonnegative().safe() })
  .strict();
// Fastify hands querystring values through as strings; `z.coerce.boolean()`
// would treat the string "false" as truthy (`Boolean('false') === true`), so
// the two accepted values are matched explicitly and mapped by hand instead.
const listTimelinesQuery = z
  .object({
    published: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) =>
        value === undefined ? undefined : value === 'true'
      )
  })
  .strict();
const createTimeline = versionedTimelineZod
  .omit({ schemaVersion: true, revision: true, updatedAtUtc: true })
  .extend({ eventKey: graphicIdentifierZod.optional() });
const patchTimeline = versionedTimelineZod
  .pick({
    name: true,
    description: true,
    items: true,
    variables: true,
    published: true
  })
  .partial()
  .extend({
    expectedRevision: graphicRevisionZod,
    sortOrder: z.number().int().safe().optional()
  })
  .strict();
const createRundown = rundownBaseZod
  .omit({ schemaVersion: true, revision: true, updatedAtUtc: true })
  .extend({ eventKey: graphicIdentifierZod.optional() });
const patchRundown = rundownBaseZod
  .pick({ name: true, entries: true })
  .partial()
  .extend({ expectedRevision: graphicRevisionZod })
  .strict();
const errorSchema = z.object({
  error: z.string(),
  code: z.string(),
  message: z.string(),
  retryable: z.boolean()
});
const errors = {
  400: errorSchema,
  404: errorSchema,
  409: errorSchema,
  500: errorSchema,
  503: errorSchema
};

async function respond<T>(reply: FastifyReply, operation: () => Promise<T>) {
  try {
    return reply.send(await operation());
  } catch (error) {
    const known = error instanceof GraphicsRepositoryError;
    const status = known ? error.statusCode : 503;
    return reply.code(status).send({
      error: known ? error.code : 'UNAVAILABLE',
      code: known ? error.code : 'UNAVAILABLE',
      message: known ? error.message : 'Graphics storage is unavailable',
      retryable: status === 503
    });
  }
}

/** CRUD only: live playback is owned by the separately registered playback service. */
export default async function graphicsController(
  fastify: FastifyInstance,
  options: GraphicsControllerOptions = {}
) {
  const repository = options.repository ?? new GraphicsRepository(options);
  // Request-schema failures (e.g. a DELETE/PATCH missing `expectedRevision`)
  // must be emitted in this controller's `errorSchema` envelope shape. The
  // API's global error handler emits a legacy shape that does NOT satisfy
  // these routes' declared response serializer, so the 400 fails to
  // serialize and surfaces as an opaque FST_ERR_FAILED_ERROR_SERIALIZATION
  // 500. Mirrors the identical guard in `graphicsPlaybackController`.
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
      message: 'Graphics storage is unavailable',
      retryable: true
    });
  });
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  app.get(
    '/:eventKey/timelines',
    {
      schema: {
        tags: ['Graphics'],
        params: eventParams,
        querystring: listTimelinesQuery,
        response: { 200: z.array(versionedTimelineZod), ...errors }
      }
    },
    (request, reply) =>
      respond(reply, () =>
        repository.listTimelines(request.params.eventKey, {
          published: request.query.published
        })
      )
  );
  app.get(
    '/:eventKey/timelines/:timelineId',
    {
      schema: {
        tags: ['Graphics'],
        params: timelineParams,
        response: { 200: versionedTimelineZod, ...errors }
      }
    },
    (request, reply) =>
      respond(reply, () =>
        repository.loadTimeline(
          request.params.eventKey,
          request.params.timelineId
        )
      )
  );
  app.post(
    '/:eventKey/timelines',
    {
      schema: {
        tags: ['Graphics'],
        params: eventParams,
        body: createTimeline,
        response: { 200: versionedTimelineZod, ...errors }
      }
    },
    (request, reply) =>
      respond(reply, () =>
        repository.createTimeline(request.params.eventKey, request.body)
      )
  );
  app.patch(
    '/:eventKey/timelines/:timelineId',
    {
      schema: {
        tags: ['Graphics'],
        params: timelineParams,
        body: patchTimeline,
        response: { 200: versionedTimelineZod, ...errors }
      }
    },
    (request, reply) =>
      respond(reply, () => {
        const { expectedRevision, ...patch } = request.body;
        return repository.updateTimeline(
          request.params.eventKey,
          request.params.timelineId,
          patch,
          expectedRevision
        );
      })
  );
  app.delete(
    '/:eventKey/timelines/:timelineId',
    {
      schema: {
        tags: ['Graphics'],
        params: timelineParams,
        querystring: revisionQuery,
        response: { 200: z.object({}), ...errors }
      }
    },
    (request, reply) =>
      respond(reply, async () => {
        await repository.deleteTimeline(
          request.params.eventKey,
          request.params.timelineId,
          request.query.expectedRevision
        );
        return {};
      })
  );
  app.get(
    '/:eventKey/rundowns',
    {
      schema: {
        tags: ['Graphics'],
        params: eventParams,
        response: { 200: z.array(rundownZod), ...errors }
      }
    },
    (request, reply) =>
      respond(reply, () => repository.listRundowns(request.params.eventKey))
  );
  app.get(
    '/:eventKey/rundowns/:rundownId',
    {
      schema: {
        tags: ['Graphics'],
        params: rundownParams,
        response: { 200: rundownZod, ...errors }
      }
    },
    (request, reply) =>
      respond(reply, () =>
        repository.loadRundown(
          request.params.eventKey,
          request.params.rundownId
        )
      )
  );
  app.post(
    '/:eventKey/rundowns',
    {
      schema: {
        tags: ['Graphics'],
        params: eventParams,
        body: createRundown,
        response: { 200: rundownZod, ...errors }
      }
    },
    (request, reply) =>
      respond(reply, () =>
        repository.createRundown(request.params.eventKey, request.body)
      )
  );
  app.patch(
    '/:eventKey/rundowns/:rundownId',
    {
      schema: {
        tags: ['Graphics'],
        params: rundownParams,
        body: patchRundown,
        response: { 200: rundownZod, ...errors }
      }
    },
    (request, reply) =>
      respond(reply, () => {
        const { expectedRevision, ...patch } = request.body;
        return repository.updateRundown(
          request.params.eventKey,
          request.params.rundownId,
          patch,
          expectedRevision
        );
      })
  );
  app.delete(
    '/:eventKey/rundowns/:rundownId',
    {
      schema: {
        tags: ['Graphics'],
        params: rundownParams,
        querystring: revisionQuery,
        response: { 200: z.object({}), ...errors }
      }
    },
    (request, reply) =>
      respond(reply, async () => {
        await repository.deleteRundown(
          request.params.eventKey,
          request.params.rundownId,
          request.query.expectedRevision
        );
        return {};
      })
  );
  // Existing queue shape and template variable values remain backward compatible.
  app.get(
    '/:eventKey/queue',
    {
      schema: {
        tags: ['Graphics'],
        params: eventParams,
        response: { 200: cueQueueZod, ...errors }
      }
    },
    (request, reply) =>
      respond(reply, () => repository.loadQueue(request.params.eventKey))
  );
  app.put(
    '/:eventKey/queue',
    {
      schema: {
        tags: ['Graphics'],
        params: eventParams,
        body: z.object({ entries: z.array(queueEntryZod) }).strict(),
        response: { 200: cueQueueZod, ...errors }
      }
    },
    (request, reply) =>
      respond(reply, () =>
        repository.saveQueue(request.params.eventKey, request.body.entries)
      )
  );
}
