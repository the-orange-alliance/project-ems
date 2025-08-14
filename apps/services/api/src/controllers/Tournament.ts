import {
  Tournament,
  tournamentDatabaseZod,
  tournamentZod,
  toDatabaseZod
} from '@toa-lib/models';
import { FastifyInstance} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { getDB } from '../db/EventDatabase.js';
import { z } from 'zod';
import { DataNotFoundError, errorableSchema, InternalServerError } from '../util/Errors.js';
import { EventKeyParams, EventTournamentKeyParams, EmptySchema } from '../util/GlobalSchema.js';

const TournamentArraySchema = z.array(tournamentZod);

async function tournamentController(fastify: FastifyInstance) {
  // Get tournaments by eventKey
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/:eventKey',
    { schema: { params: EventKeyParams, response: errorableSchema(z.array(tournamentZod), DataNotFoundError), tags: ['Tournaments'] } },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        const data = await db.selectAllWhere('tournament', `eventKey = "${eventKey}"`);
        if (!data) {
          reply.send(DataNotFoundError);
        } else {
          reply.send(data.map((t: any) => tournamentDatabaseZod.parse(t)));
        }
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Insert tournaments
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/',
    { schema: { body: TournamentArraySchema, response: errorableSchema(EmptySchema), tags: ['Tournaments'] } },
    async (request, reply) => {
      try {
        const { eventKey } = request.body[0];
        const db = await getDB(eventKey);
        await db.insertValue(
          'tournament',
          request.body.map((t: Tournament) => toDatabaseZod.parse(t))
        );
        reply.status(200).send({});
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Update tournament
  fastify.withTypeProvider<ZodTypeProvider>().patch(
    '/:eventKey/:tournamentKey',
    { schema: { params: EventTournamentKeyParams, body: tournamentZod, response: errorableSchema(EmptySchema), tags: ['Tournaments'] } },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey } = request.params as z.infer<typeof EventTournamentKeyParams>;
        const db = await getDB(eventKey);
        await db.updateWhere(
          'tournament',
          toDatabaseZod.parse(request.body),
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
        );
        reply.status(200).send({});
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );
}

export default tournamentController;
