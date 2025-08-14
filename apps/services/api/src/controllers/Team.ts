import { FastifyInstance} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { getDB } from '../db/EventDatabase.js';
import { z } from 'zod';
import { DataNotFoundError, errorableSchema, InternalServerError } from '../util/Errors.js';
import { teamZod } from '@toa-lib/models';
import { EventKeyParams, EmptySchema, EventTeamKeyParams } from '../util/GlobalSchema.js';

const teamsZod = z.array(teamZod);

async function teamController(fastify: FastifyInstance) {
  // Get all teams (global)
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/',
    { schema: { response: errorableSchema<typeof teamsZod>(teamsZod), tags: ['Teams'] } },
    async (request, reply) => {
      try {
        const db = await getDB('global');
        const data = await db.selectAll('team');
        reply.send(data);
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Get teams by eventKey
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/:eventKey',
    { schema: { params: EventKeyParams, response: errorableSchema<typeof teamsZod, typeof DataNotFoundError>(teamsZod, DataNotFoundError), tags: ['Teams'] } },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        const data = await db.selectAllWhere('team', `eventKey = "${eventKey}"`);
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

  // Insert teams for event
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/:eventKey',
    { schema: { params: EventKeyParams, body: teamsZod, response: errorableSchema<typeof EmptySchema>(EmptySchema), tags: ['Teams'] } },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        await db.insertValue('team', request.body);
        reply.status(200).send({});
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Update team for event
  fastify.withTypeProvider<ZodTypeProvider>().patch(
    '/:eventKey/:teamKey',
    { schema: { params: EventTeamKeyParams, body: teamZod, response: errorableSchema<typeof EmptySchema>(EmptySchema), tags: ['Teams'] } },
    async (request, reply) => {
      try {
        const { eventKey, teamKey } = request.params as z.infer<typeof EventTeamKeyParams>;
        const db = await getDB(eventKey);
        await db.updateWhere(
          'team',
          request.body,
          `eventKey = "${eventKey}" AND teamKey = "${teamKey}"`
        );
        reply.status(200).send({});
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Delete team for event
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    '/:eventKey/:teamKey',
    { schema: { params: EventTeamKeyParams, response: errorableSchema<typeof EmptySchema, typeof DataNotFoundError>(EmptySchema, DataNotFoundError), tags: ['Teams'] } },
    async (request, reply) => {
      try {
        const { eventKey, teamKey } = request.params as z.infer<typeof EventTeamKeyParams>;
        const db = await getDB(eventKey);
        const data = await db.deleteWhere(
          'team',
          `eventKey = "${eventKey}" AND teamKey = ${teamKey}`
        );
        if (!data) {
          reply.send(DataNotFoundError);
        } else {
          reply.send({});
        }
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );
}

export default teamController;
