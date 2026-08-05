import {
  MatchMakerParams,
  Match,
  MatchDetailBase,
  matchMakerParamsZod,
  matchParticipantZod,
  reconcileMatchParticipants,
  getFunctionsBySeasonKey,
  getCardCarryPhase,
  RESULT_BLUE_WIN,
  RESULT_GAME_SPECIFIC,
  RESULT_RED_WIN,
  RESULT_TIE
} from '@toa-lib/models';
import { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  DataNotFoundError,
  InvalidDataError,
  errorableSchema,
  InternalServerError
} from '../util/Errors.js';
import { join } from 'path';
import { writeFile } from 'fs/promises';
import {
  environment as env,
  executeMatchMaker,
  getAppData,
  getArgFromQualityStr
} from '@toa-lib/server';
import logger from '../util/Logger.js';
import { getDB, __dirname } from '../db/EventDatabase.js';
import {
  EventKeyParams,
  EventTournamentKeyParams,
  EventTournamentIdParams,
  EmptySchema
} from '../util/GlobalSchema.js';
import { matchWithDetailsZod } from '@toa-lib/models/base';
import { platform } from 'os';
import { computeCycleTime } from '../util/CycleTime.js';

const MatchArraySchema = z.array(matchWithDetailsZod);
const MatchParticipantArraySchema = z.array(matchParticipantZod);

const MatchScoreSchema = z.object({
  redScore: z.number(),
  blueScore: z.number(),
  result: z.number()
});

const MatchScoreChangeSchema = z.object({
  id: z.number(),
  name: z.string(),
  previous: MatchScoreSchema,
  current: MatchScoreSchema,
  resultChanged: z.boolean()
});

const RecalculateSkipSchema = z.object({
  id: z.number(),
  reason: z.string()
});

/** What `/recalculate-scores` actually did, so the caller can see it. */
const RecalculateSummarySchema = z.object({
  matchesExamined: z.number(),
  matchesChanged: z.number(),
  changes: z.array(MatchScoreChangeSchema),
  skipped: z.array(RecalculateSkipSchema)
});

async function matchController(fastify: FastifyInstance) {
  // SPECIAL ROUTES
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/create',
    {
      schema: {
        body: matchMakerParamsZod,
        response: errorableSchema(MatchArraySchema),
        tags: ['Matches']
      }
    },
    async (request, reply) => {
      try {
        const isProd = env.isProd();
        const extension = platform() === 'win32' ? '.exe' : '';
        const matchMakerPath = join(
          __dirname,
          isProd ? `./bin/MatchMaker${extension}` : '../../bin/MatchMaker.exe'
        );
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
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Get all matches for event
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/:eventKey',
    {
      schema: {
        params: EventKeyParams,
        response: errorableSchema(z.union([z.any(), MatchArraySchema])),
        tags: ['Matches']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        const data = await db.selectAllWhere(
          'match',
          `eventKey = "${eventKey}"`
        );
        reply.send(data);
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Get all participants for event
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/participants/:eventKey',
    {
      schema: {
        params: EventKeyParams,
        response: errorableSchema(
          z.union([z.any(), MatchParticipantArraySchema])
        ),
        tags: ['Matches']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        const data = await db.selectAllWhere(
          'match_participant',
          `eventKey = "${eventKey}"`
        );
        reply.send(data);
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Get matches for event/tournament
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/:eventKey/:tournamentKey',
    {
      schema: {
        params: EventTournamentKeyParams,
        response: errorableSchema(z.union([z.any(), MatchArraySchema])),
        tags: ['Matches']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey } = request.params as z.infer<
          typeof EventTournamentKeyParams
        >;
        const db = await getDB(eventKey);
        const data = await db.selectAllWhere(
          'match',
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
        );
        const participants = await db.selectAllWhere(
          'match_participant',
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
        );
        reply.send(reconcileMatchParticipants(data, participants));
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Get full match details
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/all/:eventKey/:tournamentKey/:id',
    {
      schema: {
        params: EventTournamentIdParams,
        response: errorableSchema(z.union([z.any(), matchWithDetailsZod])),
        tags: ['Matches']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey, id } = request.params as z.infer<
          typeof EventTournamentIdParams
        >;
        const db = await getDB(eventKey);
        const [match] = await db.selectAllWhere(
          'match',
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`
        );
        const participants = await db.selectAllWhere(
          'match_participant',
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`
        );
        const [details] = await db.selectAllWhere(
          'match_detail',
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`
        );
        const funcs = getFunctionsBySeasonKey(
          eventKey.split('-')[0].toLowerCase()
        );
        const parsedDetails = funcs?.detailsFromJson
          ? (funcs.detailsFromJson(details) ?? details)
          : details;
        // A carried card is only in force during the phase it was earned in, so
        // it is scoped here rather than at every display. This route is the
        // authoritative source of `participant.team` for the audience display
        // and the scorekeeper's repeat-card prompt, and unlike them it knows
        // which tournament is being played. Prestarting the first match of a
        // new phase therefore "resets" the cards with no reset step to run.
        const [tournament] = await db.selectAllWhere(
          'tournament',
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
        );
        const phase = tournament ? getCardCarryPhase(tournament) : null;
        for (let i = 0; i < participants.length; i++) {
          const [team] = await db.selectAllWhere(
            'team',
            `teamKey = ${participants[i].teamKey} AND eventKey = "${eventKey}"`
          );
          // A null phase (test/practice) matches nothing, which is what makes
          // carried cards invisible there.
          participants[i].team =
            team && team.cardPhase && team.cardPhase === phase
              ? team
              : { ...team, cardStatus: 0, hasCard: 0, cardPhase: null };
        }
        match.participants = participants;
        match.details = parsedDetails;
        reply.send(match);
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Get match by id
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/:eventKey/:tournamentKey/:id',
    {
      schema: {
        params: EventTournamentIdParams,
        response: errorableSchema(MatchArraySchema),
        tags: ['Matches']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey, id } = request.params as z.infer<
          typeof EventTournamentIdParams
        >;
        const db = await getDB(eventKey);
        const data = await db.selectAllWhere(
          'match',
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`
        );
        if (!data) {
          reply.code(DataNotFoundError.code).send(DataNotFoundError);
        } else {
          reply.send(data);
        }
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Insert matches
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/:eventKey',
    {
      schema: {
        params: EventKeyParams,
        body: MatchArraySchema,
        response: errorableSchema(EmptySchema),
        tags: ['Matches']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        const pureMatches: Match<any>[] = request.body.map((m: Match<any>) => ({
          ...m
        }));
        for (const match of pureMatches) delete match.participants;
        const participants = request.body
          .map((match: Match<any>) => match.participants || [])
          .flat();
        const details: MatchDetailBase[] = request.body.map(
          (match: Match<any>) => ({
            eventKey: match.eventKey,
            tournamentKey: match.tournamentKey,
            id: match.id
          })
        );
        await db.insertValue('match', pureMatches);
        await db.insertValue('match_participant', participants);
        await db.insertValue('match_detail', details);
        reply.status(200).send({});
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Update match
  fastify.withTypeProvider<ZodTypeProvider>().patch(
    '/:eventKey/:tournamentKey/:id',
    {
      schema: {
        params: EventTournamentIdParams,
        body: matchWithDetailsZod,
        response: errorableSchema(EmptySchema),
        tags: ['Matches']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey, id } = request.params as z.infer<
          typeof EventTournamentIdParams
        >;
        const db = await getDB(eventKey);
        const match = request.body as z.infer<typeof matchWithDetailsZod>;
        if (match.details) delete match.details;
        if (match.participants) delete match.participants;

        // Cycle time is derived, never client-supplied, so that every client
        // agrees on it. Recomputed only on the patch that first records this
        // match's actual start — later patches (commit, score edits) resend the
        // same actualStartTime and must not disturb the stored value.
        const [stored] = await db.selectAllWhere(
          'match',
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`
        );
        if (
          match.actualStartTime &&
          match.actualStartTime !== stored?.actualStartTime
        ) {
          const cycleTime = await computeCycleTime(db, match);
          if (cycleTime !== null) match.cycleTime = cycleTime;
        }

        if (match.active === 1) {
          await db.updateWhere(
            'match',
            { active: 0 },
            'active = 1 AND fieldNumber = ' + match.fieldNumber
          );
        }

        await db.updateWhere(
          'match',
          match,
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`
        );
        reply.status(200).send({});
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Update match details
  fastify.withTypeProvider<ZodTypeProvider>().patch(
    '/details/:eventKey/:tournamentKey/:id',
    {
      schema: {
        params: EventTournamentIdParams,
        body: z.any(),
        response: errorableSchema(EmptySchema, InvalidDataError),
        tags: ['Matches']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey, id } = request.params as z.infer<
          typeof EventTournamentIdParams
        >;
        const db = await getDB(eventKey);
        const funcs = getFunctionsBySeasonKey(
          eventKey.split('-')[0].toLowerCase()
        );
        const body = request.body as any;
        if (
          body.eventKey !== eventKey ||
          body.tournamentKey !== tournamentKey ||
          String(body.id) !== id
        ) {
          reply.code(InvalidDataError.code).send(InvalidDataError);
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
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Update match participants
  fastify.withTypeProvider<ZodTypeProvider>().patch(
    '/participants/:eventKey/:tournamentKey/:id',
    {
      schema: {
        params: EventTournamentIdParams,
        body: MatchParticipantArraySchema,
        response: errorableSchema(EmptySchema),
        tags: ['Matches']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey, id } = request.params as z.infer<
          typeof EventTournamentIdParams
        >;
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
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Delete matches for event/tournament
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    '/:eventKey/:tournamentKey',
    {
      schema: {
        params: EventTournamentKeyParams,
        response: errorableSchema(EmptySchema),
        tags: ['Matches']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey } = request.params as z.infer<
          typeof EventTournamentKeyParams
        >;
        const db = await getDB(eventKey);
        await db.deleteWhere(
          'match',
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
        );
        await db.deleteWhere(
          'match_participant',
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
        );
        await db.deleteWhere(
          'match_detail',
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
        );
        reply.status(200).send({});
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Recalculate Match Scores
  //
  // Re-derives every played match's details and scores from the stored match
  // details, and writes the results back. Previously this only logged what it
  // would have changed and never replied at all, so callers hung until they
  // timed out and the recalculated scores were thrown away.
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/recalculate-scores/:eventKey/:tournamentKey',
    {
      schema: {
        params: EventTournamentKeyParams,
        response: errorableSchema(RecalculateSummarySchema),
        tags: ['Matches']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey } = request.params as z.infer<
          typeof EventTournamentKeyParams
        >;
        const db = await getDB(eventKey);
        const funcs = getFunctionsBySeasonKey(
          eventKey.split('-')[0].toLowerCase()
        );
        logger.info(
          `Recalculating scores for event ${eventKey} tournament ${tournamentKey}`
        );

        const matches = await db.selectAllWhere(
          'match',
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND result > -1`
        );
        const matchDetails = await db.selectAllWhere(
          'match_detail',
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
        );
        const detailsMap = new Map<number, any>();
        for (const detail of matchDetails) {
          detailsMap.set(detail.id, detail);
        }

        const changes: z.infer<typeof MatchScoreChangeSchema>[] = [];
        const skipped: z.infer<typeof RecalculateSkipSchema>[] = [];

        for (const m of matches) {
          const stored = detailsMap.get(m.id);
          if (!stored) {
            skipped.push({ id: m.id, reason: 'no match details found' });
            continue;
          }
          // Parse the row the same way GET /all does before handing it to
          // season code — the raw row is not the season's detail shape.
          const detail = funcs?.detailsFromJson
            ? (funcs.detailsFromJson(stored) ?? stored)
            : stored;
          const newDetails = funcs?.calculateRankingPoints?.(detail);
          if (!newDetails) {
            skipped.push({ id: m.id, reason: 'season returned no details' });
            continue;
          }
          const [redScore, blueScore] = funcs?.calculateScore?.({
            ...m,
            details: newDetails
          }) ?? [-1, -1];

          // Keep `result` consistent with the scores we just wrote. Leaving a
          // stale result next to a changed score is worse than not recalculating
          // at all. Game-specific results are decided by something other than
          // the score comparison, so those are left alone.
          const result =
            m.result === RESULT_GAME_SPECIFIC
              ? m.result
              : redScore > blueScore
                ? RESULT_RED_WIN
                : blueScore > redScore
                  ? RESULT_BLUE_WIN
                  : RESULT_TIE;

          await db.updateWhere(
            'match_detail',
            funcs?.detailsToJson ? funcs.detailsToJson(newDetails) : newDetails,
            `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${m.id}`
          );

          const scoreChanged =
            redScore !== m.redScore || blueScore !== m.blueScore;
          const resultChanged = result !== m.result;
          if (scoreChanged || resultChanged) {
            await db.updateWhere(
              'match',
              { redScore, blueScore, result },
              `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${m.id}`
            );
            const change = {
              id: m.id,
              name: m.name,
              previous: {
                redScore: m.redScore,
                blueScore: m.blueScore,
                result: m.result
              },
              current: { redScore, blueScore, result },
              resultChanged
            };
            changes.push(change);
            logger.info(
              `Match ${m.id} recalculated: ${m.redScore}-${m.blueScore} -> ${redScore}-${blueScore}` +
                (resultChanged ? ` (result ${m.result} -> ${result})` : '')
            );
          }
        }

        reply.status(200).send({
          matchesExamined: matches.length,
          matchesChanged: changes.length,
          changes,
          skipped
        });
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );
}

export default matchController;
