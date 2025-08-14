import {
  MatchMakerParams,
  Match,
  MatchDetailBase,
  matchMakerParamsZod,
  matchZod,
  matchParticipantZod,
  reconcileMatchParticipants,
  getFunctionsBySeasonKey
} from '@toa-lib/models';
import { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { DataNotFoundError, InvalidDataError, errorableSchema, InternalServerError } from '../util/Errors.js';
import { join } from 'path';
import { writeFile } from 'fs/promises';
import {
  executeMatchMaker,
  getAppData,
  getArgFromQualityStr
} from '@toa-lib/server';
import logger from '../util/Logger.js';
import { getDB, __dirname } from '../db/EventDatabase.js';
import { EventKeyParams, EventTournamentKeyParams, EventTournamentIdParams, EmptySchema } from '../util/GlobalSchema.js';

const MatchArraySchema = z.array(matchZod);
const MatchParticipantArraySchema = z.array(matchParticipantZod);

async function matchController(fastify: FastifyInstance) {
  // SPECIAL ROUTES
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/create',
    { schema: { body: matchMakerParamsZod, response: errorableSchema(MatchArraySchema), tags: ['Matches'] } },
    async (request, reply) => {
      try {
        const matchMakerPath = join(__dirname, '../../bin/MatchMaker.exe');
        const config: MatchMakerParams = request.body;
        const teamsPath = join(
          getAppData('ems'),
          `${config.eventKey}_${config.tournamentKey}_teams.txt`
        );
        const contents = config.teamKeys.toString().replace(/,/g, '\n');
        await writeFile(teamsPath, contents);
        logger.info(`wrote teams file at ${teamsPath}`);
        const matchMakerArgs = [
          '-l',
          teamsPath,
          '-t',
          config.teamsParticipating.toString(),
          '-r',
          config.matchesPerTeam.toString(),
          '-a',
          config.teamsPerAlliance.toString(),
          getArgFromQualityStr(config.quality),
          '-s',
          '-o'
        ];
        logger.info(
          `executing matchmaker (${matchMakerPath}) with arguments ${matchMakerArgs.toString()}`
        );
        const matches = await executeMatchMaker(
          matchMakerPath,
          matchMakerArgs,
          config
        );
        logger.info('matchmaker complete - sending results');
        reply.send(matches);
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Get all matches for event
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/:eventKey',
    { schema: { params: EventKeyParams, response: errorableSchema(MatchArraySchema), tags: ['Matches'] } },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        const data = await db.selectAllWhere('match', `eventKey = "${eventKey}"`);
        reply.send(data);
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Get all participants for event
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/participants/:eventKey',
    { schema: { params: EventKeyParams, response: errorableSchema(MatchParticipantArraySchema), tags: ['Matches'] } },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        const data = await db.selectAllWhere('match_participant', `eventKey = "${eventKey}"`);
        reply.send(data);
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Get matches for event/tournament
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/:eventKey/:tournamentKey',
    { schema: { params: EventTournamentKeyParams, response: errorableSchema(MatchArraySchema), tags: ['Matches'] } },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey } = request.params as z.infer<typeof EventTournamentKeyParams>;
        const db = await getDB(eventKey);
        const data = await db.selectAllWhere('match', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`);
        const participants = await db.selectAllWhere('match_participant', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`);
        reply.send(reconcileMatchParticipants(data, participants));
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Get full match details
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/all/:eventKey/:tournamentKey/:id',
    { schema: { params: EventTournamentIdParams, response: errorableSchema(matchZod), tags: ['Matches'] } },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey, id } = request.params as z.infer<typeof EventTournamentIdParams>;
        const db = await getDB(eventKey);
        const [match] = await db.selectAllWhere('match', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`);
        const participants = await db.selectAllWhere('match_participant', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`);
        const [details] = await db.selectAllWhere('match_detail', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`);
        const funcs = getFunctionsBySeasonKey(eventKey.split('-')[0].toLowerCase());
        const parsedDetails = funcs?.detailsFromJson ? funcs.detailsFromJson(details) : details;
        for (let i = 0; i < participants.length; i++) {
          const [team] = await db.selectAllWhere('team', `teamKey = ${participants[i].teamKey} AND eventKey = "${eventKey}"`);
          participants[i].team = team;
        }
        match.participants = participants;
        match.details = parsedDetails;
        reply.send(match);
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Get match by id
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/:eventKey/:tournamentKey/:id',
    { schema: { params: EventTournamentIdParams, response: errorableSchema(MatchArraySchema), tags: ['Matches'] } },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey, id } = request.params as z.infer<typeof EventTournamentIdParams>;
        const db = await getDB(eventKey);
        const data = await db.selectAllWhere('match', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`);
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

  // Insert matches
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/:eventKey',
    { schema: { params: EventKeyParams, body: MatchArraySchema, response: errorableSchema(EmptySchema), tags: ['Matches'] } },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        const pureMatches: Match<any>[] = request.body.map((m: Match<any>) => ({ ...m }));
        for (const match of pureMatches) delete match.participants;
        const participants = request.body.map((match: Match<any>) => match.participants || []).flat();
        const details: MatchDetailBase[] = request.body.map((match: Match<any>) => ({
          eventKey: match.eventKey,
          tournamentKey: match.tournamentKey,
          id: match.id
        }));
        await db.insertValue('match', pureMatches);
        await db.insertValue('match_participant', participants);
        await db.insertValue('match_detail', details);
        reply.status(200).send({});
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Update match
  fastify.withTypeProvider<ZodTypeProvider>().patch(
    '/:eventKey/:tournamentKey/:id',
    { schema: { params: EventTournamentIdParams, body: matchZod, response: errorableSchema(EmptySchema), tags: ['Matches'] } },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey, id } = request.params as z.infer<typeof EventTournamentIdParams>;
        const db = await getDB(eventKey);
        const match = request.body;
        if (match.details) delete match.details;
        if (match.participants) delete match.participants;
        await db.updateWhere(
          'match',
          request.body,
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`
        );
        reply.status(200).send({});
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Update match details
  fastify.withTypeProvider<ZodTypeProvider>().patch(
    '/details/:eventKey/:tournamentKey/:id',
    { schema: { params: EventTournamentIdParams, body: z.any(), response: errorableSchema(EmptySchema), tags: ['Matches'] } },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey, id } = request.params as z.infer<typeof EventTournamentIdParams>;
        const db = await getDB(eventKey);
        const funcs = getFunctionsBySeasonKey(eventKey.split('-')[0].toLowerCase());
        const body = request.body as any;
        if (
          body.eventKey !== eventKey ||
          body.tournamentKey !== tournamentKey ||
          String(body.id) !== id
        ) {
          reply.send(InvalidDataError);
          return;
        }
        const data = funcs?.detailsToJson ? funcs.detailsToJson(body) : body;
        await db.updateWhere(
          'match_detail',
          data,
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`
        );
        reply.status(200).send({});
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Update match participants
  fastify.withTypeProvider<ZodTypeProvider>().patch(
    '/participants/:eventKey/:tournamentKey/:id',
    { schema: { params: EventTournamentIdParams, body: MatchParticipantArraySchema, response: errorableSchema(EmptySchema), tags: ['Matches'] } },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey, id } = request.params as z.infer<typeof EventTournamentIdParams>;
        const db = await getDB(eventKey);
        const participants = request.body;
        for (const participant of participants) {
          if (participant.team) delete participant.team;
          const { station } = participant;
          await db.updateWhere(
            'match_participant',
            participant,
            `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id} AND station = ${station}`
          );
        }
        reply.status(200).send({});
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Delete matches for event/tournament
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    '/:eventKey/:tournamentKey',
    { schema: { params: EventTournamentKeyParams, response: errorableSchema(EmptySchema), tags: ['Matches'] } },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey } = request.params as z.infer<typeof EventTournamentKeyParams>;
        const db = await getDB(eventKey);
        await db.deleteWhere('match', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`);
        await db.deleteWhere('match_participant', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`);
        await db.deleteWhere('match_detail', `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`);
        reply.status(200).send({});
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );
}

export default matchController;
