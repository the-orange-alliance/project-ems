import { allianceMemberZod } from '@toa-lib/models';
import { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { getDB } from '../db/EventDatabase.js';
import { z } from 'zod';
import {
  DataNotFoundError,
  errorableSchema,
  InternalServerError
} from '../util/Errors.js';
import {
  EmptySchema,
  EventKeyParams,
  EventTournamentKeyParams,
  EventTournamentRankParams,
  EventTournamentTeamKeyParams
} from '../util/GlobalSchema.js';

async function allianceController(fastify: FastifyInstance) {
  // Get all alliances for event
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/:eventKey',
    {
      schema: {
        params: EventKeyParams,
        response: errorableSchema(
          z.union([z.any(), z.array(allianceMemberZod)])
        ),
        tags: ['Alliances']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        const data = await db.selectAllWhere(
          'alliance',
          `eventKey = "${eventKey}" ORDER BY allianceNameLong ASC, pickOrder ASC`
        );
        reply.send(data);
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Get all alliances for event/tournament
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/:eventKey/:tournamentKey',
    {
      schema: {
        params: EventTournamentKeyParams,
        response: errorableSchema(
          z.union([z.any(), z.array(allianceMemberZod)])
        ),
        tags: ['Alliances']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey } = request.params as z.infer<
          typeof EventTournamentKeyParams
        >;
        const db = await getDB(eventKey);
        const data = await db.selectAllWhere(
          'alliance',
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" ORDER BY allianceNameLong ASC, pickOrder ASC`
        );
        reply.send(data);
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Get alliance by rank
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/:eventKey/:tournamentKey/:rank',
    {
      schema: {
        params: EventTournamentRankParams,
        response: errorableSchema(
          z.union([z.any(), z.array(allianceMemberZod)]),
          DataNotFoundError
        ),
        tags: ['Alliances']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey, rank } = request.params as z.infer<
          typeof EventTournamentRankParams
        >;
        const db = await getDB(eventKey);
        const data = await db.selectAllWhere(
          'alliance',
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND allianceRank = ${rank}`
        );
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

  // Insert alliances
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/:eventKey',
    {
      schema: {
        params: EventKeyParams,
        body: z.array(allianceMemberZod),
        response: errorableSchema(EmptySchema),
        tags: ['Alliances']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        await db.insertValue('alliance', request.body);
        reply.status(200).send({});
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Update alliance
  fastify.withTypeProvider<ZodTypeProvider>().patch(
    '/:eventKey/:tournamentKey/:teamKey',
    {
      schema: {
        params: EventTournamentTeamKeyParams,
        body: allianceMemberZod,
        response: errorableSchema(EmptySchema),
        tags: ['Alliances']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey, teamKey } = request.params as z.infer<
          typeof EventTournamentTeamKeyParams
        >;
        const db = await getDB(eventKey);
        await db.updateWhere(
          'alliance',
          request.body,
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND teamKey = "${teamKey}"`
        );
        reply.status(200).send({});
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Delete alliances for event/tournament
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    '/:eventKey/:tournamentKey',
    {
      schema: {
        params: EventTournamentKeyParams,
        response: errorableSchema(EmptySchema),
        tags: ['Alliances']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey } = request.params as z.infer<
          typeof EventTournamentKeyParams
        >;
        const db = await getDB(eventKey);
        await db.deleteWhere(
          'alliance',
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
        );
        reply.status(200).send({});
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );
}

export default allianceController;
