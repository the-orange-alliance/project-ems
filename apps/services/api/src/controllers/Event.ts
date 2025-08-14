import { eventZod, getSeasonKeyFromEventKey } from '@toa-lib/models';
import { FastifyInstance} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { getDB } from '../db/EventDatabase.js';
import { z } from 'zod';
import { DataNotFoundError, errorableSchema, GenericInternalServerError, InternalServerError } from '../util/Errors.js';
import { EventKeyParams } from '../util/GlobalSchema.js';

const eventsZod = z.array(eventZod);

async function eventController(fastify: FastifyInstance) {
  // Get all events
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/',
    { schema: { response: errorableSchema<typeof eventsZod>(eventsZod), tags: ['Events'] } },
    async (request, reply) => {
      try {
        const db = await getDB('global');
        const data = await db.selectAll('event');
        reply.send(data);
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Get event by key
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/:eventKey',
    { schema: { params: EventKeyParams, response: errorableSchema<typeof eventZod, typeof DataNotFoundError>(eventZod, DataNotFoundError), tags: ['Events'] } },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB('global');
        const data = await db.selectAllWhere('event', `eventKey = "${eventKey}"`);
        if (data.length === 0) {
          reply.send(DataNotFoundError);
        } else {
          reply.send(data[0]);
        }
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Create event
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/',
    { schema: { body: eventZod, response: errorableSchema(z.object({})), tags: ['Events'] } },
    async (request, reply) => {
      try {
        const db = await getDB('global');
        await db.insertValue('event', [request.body]);
        reply.status(200).send({});
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  const emptyResponseSchema = z.object({});

  // Update event
  fastify.withTypeProvider<ZodTypeProvider>().patch(
    '/:eventKey',
    { schema: { params: EventKeyParams, body: eventZod, response: errorableSchema<typeof emptyResponseSchema>(emptyResponseSchema), tags: ['Events'] } },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB('global');
        await db.updateWhere('event', request.body, `eventKey = "${eventKey}"`);
        reply.status(200).send({});
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Setup event
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/setup/:eventKey',
    { schema: { params: EventKeyParams, response: errorableSchema<typeof emptyResponseSchema>(emptyResponseSchema), tags: ['Events'] } },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        await db.createEventBase();
        await db.createEventGameSpecifics(getSeasonKeyFromEventKey(eventKey));
        reply.status(200).send({});
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );
}

export default eventController;
