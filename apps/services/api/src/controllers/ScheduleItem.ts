import { scheduleItemZod, teamZod } from '@toa-lib/models';
import { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { getDB } from '../db/EventDatabase.js';
import { errorableSchema, DataNotFoundError, InternalServerError } from '../util/Errors.js';
import { EventKeyParams, EventTournamentKeyParams, EmptySchema } from '../util/GlobalSchema.js';

const ScheduleItemArraySchema = z.array(scheduleItemZod);

async function scheduleItemController(fastify: FastifyInstance) {
  // Get all schedule items for event
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/:eventKey',
    { schema: { params: EventKeyParams, response: errorableSchema(ScheduleItemArraySchema, DataNotFoundError), tags: ['Schedule Items'] } },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        const data = await db.selectAllWhere('schedule', `eventKey = '${eventKey}'`);
        if (!data) {
          reply.send(DataNotFoundError);
        } else {
          reply.send(data);
        }
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Get schedule items for event/tournament
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/:eventKey/:tournamentKey',
    { schema: { params: EventTournamentKeyParams, response: errorableSchema(ScheduleItemArraySchema, DataNotFoundError), tags: ['Schedule Items'] } },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey } = request.params as z.infer<typeof EventTournamentKeyParams>;
        const db = await getDB(eventKey);
        const data = await db.selectAllWhere('schedule', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`);
        if (!data) {
          reply.send(DataNotFoundError);
        } else {
          reply.send(data);
        }
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Insert schedule items
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/',
    { schema: { body: ScheduleItemArraySchema, response: errorableSchema(EmptySchema), tags: ['Schedule Items'] } },
    async (request, reply) => {
      try {
        const { eventKey } = request.body[0];
        const db = await getDB(eventKey);
        await db.insertValue('schedule', request.body);
        reply.status(200).send({});
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Delete schedule items for event/tournament
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    '/:eventKey/:tournamentKey',
    { schema: { params: EventTournamentKeyParams, response: errorableSchema(EmptySchema), tags: ['Schedule Items'] } },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey } = request.params as z.infer<typeof EventTournamentKeyParams>;
        const db = await getDB(eventKey);
        await db.deleteWhere('schedule', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`);
        reply.status(200).send({});
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Update schedule item
  fastify.withTypeProvider<ZodTypeProvider>().patch(
    '/:eventKey/:tournamentKey/:id',
    { schema: { params: EventTournamentKeyParams.extend({ id: z.string() }), body: teamZod, response: errorableSchema(EmptySchema), tags: ['Schedule Items'] } },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey, id } = request.params as z.infer<typeof EventTournamentKeyParams> & { id: string };
        const db = await getDB(eventKey);
        await db.updateWhere('schedule', request.body, `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = "${id}"`);
        reply.status(200).send({});
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );
}

export default scheduleItemController;
