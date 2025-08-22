import { defaultScheduleParams, teamZod } from '@toa-lib/models';
import { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { getDB } from '../db/EventDatabase.js';
import { errorableSchema, DataNotFoundError, InternalServerError } from '../util/Errors.js';
import { EventKeyParams, EventTournamentKeyParams, EmptySchema } from '../util/GlobalSchema.js';

const ScheduleParamsArraySchema = z.array(z.any()); // Replace with a real zod schema if available

async function scheduleParamsController(fastify: FastifyInstance) {
  // Get all schedule params for event
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/:eventKey',
    { schema: { params: EventKeyParams, response: errorableSchema(ScheduleParamsArraySchema, DataNotFoundError), tags: ['Schedule Parameters'] } },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        const data = await db.selectAllWhere('schedule_params', `eventKey = '${eventKey}'`);
        if (!data) {
          reply.send(DataNotFoundError);
        } else {
          reply.send(data);
        }
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Get schedule params for event/tournament
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/:eventKey/:tournamentKey',
    { schema: { params: EventTournamentKeyParams, response: errorableSchema(z.any(), DataNotFoundError), tags: ['Schedule Parameters'] } },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey } = request.params as z.infer<typeof EventTournamentKeyParams>;
        const db = await getDB(eventKey);
        const data = await db.selectAllWhere('schedule_params', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`);
        if (!data) {
          reply.send(DataNotFoundError);
        } else if (data.length === 0) {
          reply.send({ ...defaultScheduleParams, eventKey, tournamentKey });
        } else {
          const sp = data[0];
          reply.send({
            ...sp,
            teamKeys: JSON.parse(sp.teamKeys || '[]'),
            days: JSON.parse(sp.days || '[]'),
            options: JSON.parse(sp.options || '{}'),
          });
        }
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Insert schedule params
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/',
    { schema: { body: ScheduleParamsArraySchema, response: errorableSchema(EmptySchema), tags: ['Schedule Parameters'] } },
    async (request, reply) => {
      try {
        const { eventKey } = request.body[0];
        const db = await getDB(eventKey);
        await db.insertValue('schedule_params', request.body);
        reply.status(200).send({});
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Delete schedule params for event/tournament
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    '/:eventKey/:tournamentKey',
    { schema: { params: EventTournamentKeyParams, response: errorableSchema(EmptySchema), tags: ['Schedule Parameters'] } },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey } = request.params as z.infer<typeof EventTournamentKeyParams>;
        const db = await getDB(eventKey);
        await db.deleteWhere('schedule_params', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`);
        reply.status(200).send({});
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Update schedule params
  fastify.withTypeProvider<ZodTypeProvider>().patch(
    '/:eventKey/:tournamentKey',
    { schema: { params: EventTournamentKeyParams, body: z.any(), response: errorableSchema(EmptySchema), tags: ['Schedule Parameters'] } },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        const body = request.body as any;
        body.days = JSON.stringify(body.days);
        body.teamKeys = JSON.stringify(body.teamKeys);
        body.options = JSON.stringify(body.options);
        await db.upsert('schedule_params', body, ['eventKey', 'tournamentKey']);
        reply.status(200).send({});
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );
}

export default scheduleParamsController;
