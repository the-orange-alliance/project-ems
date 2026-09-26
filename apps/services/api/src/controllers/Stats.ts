import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { StatsServiceError } from '../stats/StatsWorkerPool.js';
import {
  getStatsQueryService,
  type StatsQueryServiceOptions
} from '../stats/StatsQueryService.js';
import {
  eventParams,
  queryBody,
  responseSchema,
  errorSchema,
  queueSchema,
  reorderSchema,
  catalogueSchema
} from '../stats/StatsSchemas.js';
export interface StatsControllerOptions extends StatsQueryServiceOptions {}
export default async function statsController(
  fastify: FastifyInstance,
  options: StatsControllerOptions = {}
) {
  const service = getStatsQueryService(fastify, options),
    { pool } = service;
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  app.get(
    '/queue',
    { schema: { tags: ['Stats'], response: { 200: queueSchema } } },
    async () => pool.inspect()
  );
  app.post(
    '/queue/recover',
    { schema: { tags: ['Stats'], response: { 200: queueSchema } } },
    async () => pool.recover()
  );
  app.put(
    '/queue/order',
    {
      schema: {
        tags: ['Stats'],
        body: reorderSchema,
        response: { 200: queueSchema, 400: errorSchema, 409: errorSchema }
      }
    },
    async (request, reply) => {
      try {
        return pool.reorder(
          request.body.expectedQueueVersion,
          request.body.orderedJobIds
        );
      } catch (error) {
        return reply
          .code(
            error instanceof StatsServiceError
              ? (error.statusCode as 400 | 409)
              : 400
          )
          .send({
            error: 'queue_order_rejected',
            message: error instanceof Error ? error.message : 'Invalid order',
            queue: pool.inspect()
          });
      }
    }
  );
  app.get(
    '/:eventKey/catalogue',
    {
      schema: {
        tags: ['Stats'],
        params: eventParams,
        response: {
          200: catalogueSchema,
          404: errorSchema,
          503: errorSchema
        }
      }
    },
    async (request, reply) => {
      try {
        return JSON.parse(
          JSON.stringify(await service.catalogue(request.params.eventKey))
        );
      } catch (error) {
        return reply
          .code(
            error instanceof StatsServiceError
              ? (error.statusCode as 404 | 503)
              : 503
          )
          .send({
            error: 'catalogue_unavailable',
            message:
              error instanceof Error ? error.message : 'Catalogue unavailable'
          });
      }
    }
  );
  app.post(
    '/:eventKey/query',
    {
      schema: {
        tags: ['Stats'],
        params: eventParams,
        body: queryBody,
        response: {
          200: responseSchema,
          422: responseSchema,
          400: errorSchema,
          404: errorSchema,
          503: errorSchema,
          504: errorSchema
        }
      }
    },
    async (request, reply) => {
      try {
        const response = await service.query(
          request.params.eventKey,
          request.body
        );
        return reply
          .code(response.result.status === 'ok' ? 200 : 422)
          .send(response);
      } catch (error) {
        return reply
          .code(
            error instanceof StatsServiceError
              ? (error.statusCode as 400 | 404 | 503 | 504)
              : 503
          )
          .send({
            error: 'statistics_unavailable',
            message:
              error instanceof Error ? error.message : 'Statistics unavailable'
          });
      }
    }
  );
}
