import {
  getFunctionsBySeasonKey,
  getSeasonKeyFromEventKey,
  Ranking,
  rankingZod,
  reconcileMatchDetails,
  reconcileMatchParticipants,
  reconcileTeamRankings,
  Team,
  teamZod
} from '@toa-lib/models';
import { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { getDB } from '../db/EventDatabase.js';
import { z } from 'zod';
import { SeasonFunctionsMissing, errorableSchema, DataNotFoundError, InternalServerError } from '../util/Errors.js';
import { EmptySchema, EventKeyParams, EventTournamentIdParams, EventTournamentKeyParams } from '../util/GlobalSchema.js';

const rankingZodArray = z.array(rankingZod);

async function rankingController(fastify: FastifyInstance) {
  // Get rankings by eventKey
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/:eventKey',
    { schema: { params: EventKeyParams, response: errorableSchema<typeof rankingZodArray>(rankingZodArray), tags: ['Rankings'] } },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        const rankings = await db.selectAllWhere('ranking', `eventKey = "${eventKey}"`);
        const teams = await db.selectAllWhere('team', `eventKey = "${eventKey}"`);
        reply.send(reconcileTeamRankings(teams, rankings));
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Get rankings by eventKey and tournamentKey
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/:eventKey/:tournamentKey',
    { schema: { params: EventTournamentKeyParams, response: errorableSchema<typeof rankingZodArray>(rankingZodArray), tags: ['Rankings'] } },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey } = request.params as z.infer<typeof EventTournamentKeyParams>;
        const db = await getDB(eventKey);
        const rankings = await db.selectAllWhere('ranking', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`);
        const teams = await db.selectAllWhere('team', `eventKey = "${eventKey}"`);
        reply.send(reconcileTeamRankings(teams, rankings));
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Get ranking details by eventKey, tournamentKey, and id
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/:eventKey/:tournamentKey/:id',
    { schema: { params: EventTournamentIdParams, response: errorableSchema<typeof rankingZodArray>(rankingZodArray), tags: ['Rankings'] } },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey, id } = request.params as z.infer<typeof EventTournamentIdParams>;
        const db = await getDB(eventKey);
        const rankings = await db.selectAllJoinWhereAdvanced(
          'ranking',
          'match_participant',
          '"ranking".teamKey = "match_participant".teamKey AND "match_participant".tournamentKey = "ranking".tournamentKey',
          `match_participant.eventKey = "${eventKey}" AND match_participant.tournamentKey = "${tournamentKey}" AND match_participant.id = ${id}`
        );
        reply.send(rankings);
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Insert rankings
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/',
    { schema: { body: z.array(rankingZod), response: errorableSchema(EmptySchema), tags: ['Rankings'] } },
    async (request, reply) => {
      try {
        const eventKey = request.body[0].eventKey;
        const db = await getDB(eventKey);
        await db.insertValue('ranking', request.body);
        reply.status(200).send({});
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Create rankings for teams
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/create/:tournamentKey',
    { schema: { params: z.object({ tournamentKey: z.string() }), body: z.array(teamZod), response: errorableSchema(EmptySchema), tags: ['Rankings'] } },
    async (request, reply) => {
      try {
        const { tournamentKey } = request.params as { tournamentKey: string };
        const teams: Team[] = request.body;
        const rankings: Ranking[] = teams.map((t, i) => ({
          eventKey: t.eventKey,
          tournamentKey,
          rank: i + 1,
          losses: 0,
          played: 0,
          rankChange: 0,
          teamKey: t.teamKey,
          ties: 0,
          wins: 0
        }));
        const db = await getDB(teams[0].eventKey);
        await db.insertValue('ranking', rankings);
        reply.status(200).send({});
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Calculate rankings
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/calculate/:eventKey/:tournamentKey',
    { schema: { params: EventTournamentKeyParams, response: errorableSchema<typeof rankingZodArray>(rankingZodArray, SeasonFunctionsMissing), tags: ['Rankings'] } },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey } = request.params as z.infer<typeof EventTournamentKeyParams>;
        const { playoffs } = request.query as { playoffs?: string };
        const db = await getDB(eventKey);
        const matches = await db.selectAllWhere('match', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`);
        const participants = await db.selectAllWhere('match_participant', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`);
        const details = await db.selectAllWhere('match_detail', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`);
        const matchesWithParticipants = reconcileMatchParticipants(matches, participants);
        const matchesWithDetails = reconcileMatchDetails(matchesWithParticipants, details);
        const prevRankings = await db.selectAllWhere('ranking', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`);
        const seasonKey = getSeasonKeyFromEventKey(eventKey);
        const functions = getFunctionsBySeasonKey(seasonKey);
        if (!functions) {
          reply.send(SeasonFunctionsMissing);
          return;
        }
        if (playoffs) {
          const allianceMembers = await db.selectAllWhere('alliance', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`);
          const rankings = functions.calculatePlayoffsRankings?.(matchesWithDetails, prevRankings, allianceMembers);
          if (rankings) {
            await db.deleteWhere('ranking', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`);
            await db.insertValue('ranking', rankings);
            reply.send(rankings);
          } else {
            reply.send([]);
          }
        } else {
          const rankings = functions.calculateRankings(matchesWithDetails, prevRankings);
          await db.deleteWhere('ranking', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`);
          await db.insertValue('ranking', rankings);
          reply.send(rankings);
        }
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Delete rankings
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    '/:eventKey/:tournamentKey',
    { schema: { params: EventTournamentKeyParams, response: errorableSchema(EmptySchema), tags: ['Rankings'] } },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey } = request.params as z.infer<typeof EventTournamentKeyParams>;
        const db = await getDB(eventKey);
        await db.deleteWhere('ranking', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`);
        reply.status(200).send({});
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );
}

export default rankingController;
