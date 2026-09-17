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
import { FastifyInstance, FastifyRequest } from 'fastify';
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
import { EventDatabase, getDB, __dirname } from '../db/EventDatabase.js';
import {
  EventKeyParams,
  EventTournamentKeyParams,
  EventTournamentIdParams,
  EmptySchema
} from '../util/GlobalSchema.js';
import { matchWithDetailsZod } from '@toa-lib/models/base';
import { platform } from 'os';
import { computeCycleTime } from '../util/CycleTime.js';
import {
  nowUtc,
  participantsSinceClause,
  sinceClause,
  SinceQuery,
  touchMatch
} from '../util/MatchTimestamps.js';

const MatchArraySchema = z.array(matchWithDetailsZod);
const MatchParticipantArraySchema = z.array(matchParticipantZod);

const MatchActionEventBodySchema = z.object({
  sourceEvent: z.string(),
  fieldPath: z.string().optional(),
  oldValueJson: z.string().optional(),
  newValueJson: z.string().optional(),
  deltaNumber: z.number().optional(),
  actorId: z.string().optional(),
  actorName: z.string().optional(),
  clientId: z.string().optional(),
  socketId: z.string().optional(),
  correlationId: z.string().optional(),
  occurredAtUtc: z.string().optional(),
  persisted: z.number().int().min(0).max(1).optional()
});

const MatchHistoryQuerySchema = z.object({
  startRevision: z.coerce.number().int().positive().optional(),
  endRevision: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).default(200),
  includeActions: z.coerce.boolean().default(true)
});

const MatchPatchBodySchema = matchWithDetailsZod.extend({
  redScore: z.number().nullable().optional(),
  blueScore: z.number().nullable().optional(),
  redMinPen: z.number().nullable().optional(),
  redMajPen: z.number().nullable().optional(),
  blueMinPen: z.number().nullable().optional(),
  blueMajPen: z.number().nullable().optional()
});

type MatchAuditActionType =
  'MATCH_PATCH' | 'MATCH_DETAILS_PATCH' | 'MATCH_PARTICIPANTS_PATCH';

type MatchAuditContext = {
  actionType: MatchAuditActionType;
  source: 'api';
  actorId?: string;
  actorName?: string;
  clientId?: string;
  socketId?: string;
  correlationId?: string;
};

const getHeaderValue = (
  request: FastifyRequest,
  header: string
): string | undefined => {
  const value = request.headers[header.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return typeof value === 'string' ? value : undefined;
};

const makeAuditContext = (
  request: FastifyRequest,
  actionType: MatchAuditActionType
): MatchAuditContext => ({
  actionType,
  source: 'api',
  actorId:
    getHeaderValue(request, 'x-actor-id') ??
    getHeaderValue(request, 'x-user-id'),
  actorName:
    getHeaderValue(request, 'x-actor-name') ??
    getHeaderValue(request, 'x-user-name') ??
    getHeaderValue(request, 'x-username'),
  clientId: getHeaderValue(request, 'x-client-id'),
  socketId: getHeaderValue(request, 'x-socket-id'),
  correlationId: getHeaderValue(request, 'x-correlation-id')
});

const insertHistoryRecord = async (
  db: EventDatabase,
  table: 'match_history_base' | 'match_detail_history',
  value: Record<string, unknown>
) => {
  const entries = Object.entries(value);
  const columns = entries.map(([k]) => `"${k}"`).join(', ');
  const placeholders = entries.map(() => '?').join(', ');
  await db.db.all(
    `INSERT INTO "${table}" (${columns}) VALUES (${placeholders});`,
    entries.map(([, v]) => (typeof v === 'undefined' ? null : v))
  );
};

const isRevisionConflictError = (error: unknown): boolean => {
  const message = String((error as { message?: unknown })?.message ?? error);
  return (
    message.includes('SQLITE_CONSTRAINT: UNIQUE constraint failed') &&
    message.includes('match_history_base.eventKey') &&
    message.includes('match_history_base.revision')
  );
};

const writeMatchRevisionSnapshot = async (
  db: EventDatabase,
  eventKey: string,
  tournamentKey: string,
  id: string,
  audit: MatchAuditContext
) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const revisionRows = (await db.db.all(
        'SELECT COALESCE(MAX("revision"), 0) + 1 AS "nextRevision" FROM "match_history_base" WHERE "eventKey" = ? AND "tournamentKey" = ? AND "id" = ?;',
        [eventKey, tournamentKey, Number(id)]
      )) as { nextRevision: number }[];
      const revision = Number(revisionRows[0]?.nextRevision ?? 1);
      const occurredAtUtc = nowUtc();

      const matchRows = (await db.db.all(
        'SELECT * FROM "match" WHERE "eventKey" = ? AND "tournamentKey" = ? AND "id" = ?;',
        [eventKey, tournamentKey, Number(id)]
      )) as Record<string, unknown>[];

      if (matchRows.length === 0) {
        return;
      }

      const detailRows = (await db.db.all(
        'SELECT * FROM "match_detail" WHERE "eventKey" = ? AND "tournamentKey" = ? AND "id" = ?;',
        [eventKey, tournamentKey, Number(id)]
      )) as Record<string, unknown>[];

      const auditColumns = {
        revision,
        actionType: audit.actionType,
        source: audit.source,
        actorId: audit.actorId,
        actorName: audit.actorName,
        clientId: audit.clientId,
        socketId: audit.socketId,
        correlationId: audit.correlationId,
        occurredAtUtc
      };

      await insertHistoryRecord(db, 'match_history_base', {
        ...matchRows[0],
        ...auditColumns
      });

      await insertHistoryRecord(db, 'match_detail_history', {
        ...(detailRows[0] ?? {
          eventKey,
          tournamentKey,
          id: Number(id)
        }),
        ...auditColumns
      });

      if (audit.correlationId) {
        await db.db.all(
          'UPDATE "match_action_event" SET "revision" = ?, "persisted" = 1 WHERE "eventKey" = ? AND "tournamentKey" = ? AND "id" = ? AND "correlationId" = ? AND "persisted" = 0;',
          [revision, eventKey, tournamentKey, Number(id), audit.correlationId]
        );
      }

      return;
    } catch (e) {
      if (attempt < 4 && isRevisionConflictError(e)) {
        continue;
      }
      throw e;
    }
  }

  throw new Error('Unable to write match history snapshot after retries');
};

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
        querystring: SinceQuery,
        response: errorableSchema(z.union([z.any(), MatchArraySchema])),
        tags: ['Matches']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const { since } = request.query as z.infer<typeof SinceQuery>;
        const db = await getDB(eventKey);
        const data = await db.selectAllWhere(
          'match',
          `eventKey = "${eventKey}"${sinceClause(since)}`
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
        querystring: SinceQuery,
        response: errorableSchema(
          z.union([z.any(), MatchParticipantArraySchema])
        ),
        tags: ['Matches']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const { since } = request.query as z.infer<typeof SinceQuery>;
        const db = await getDB(eventKey);
        const data = await db.selectAllWhere(
          'match_participant',
          `eventKey = "${eventKey}"${participantsSinceClause(since)}`
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
        querystring: SinceQuery,
        response: errorableSchema(z.union([z.any(), MatchArraySchema])),
        tags: ['Matches']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey } = request.params as z.infer<
          typeof EventTournamentKeyParams
        >;
        const { since } = request.query as z.infer<typeof SinceQuery>;
        const db = await getDB(eventKey);
        const data = await db.selectAllWhere(
          'match',
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"${sinceClause(
            since
          )}`
        );
        // Nothing changed - skip the participants query rather than pulling the
        // whole tournament's worth of rows to reconcile against an empty list.
        if (data.length === 0) {
          reply.send([]);
          return;
        }
        // Fetch participants for the matches actually being returned. Ids come
        // back from SQLite as numbers, but they are going into concatenated
        // SQL, so coerce rather than trusting that.
        const ids = data.map((match) => Number(match.id)).join(', ');
        const participants = await db.selectAllWhere(
          'match_participant',
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id IN (${ids})`
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

  // Get immutable history for one match.
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/history/:eventKey/:tournamentKey/:id',
    {
      schema: {
        params: EventTournamentIdParams,
        querystring: MatchHistoryQuerySchema,
        response: errorableSchema(z.any()),
        tags: ['Matches']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey, id } = request.params as z.infer<
          typeof EventTournamentIdParams
        >;
        const { startRevision, endRevision, limit, includeActions } =
          request.query as z.infer<typeof MatchHistoryQuerySchema>;
        const db = await getDB(eventKey);

        const revFilters: string[] = [];
        const revParams: (string | number)[] = [
          eventKey,
          tournamentKey,
          Number(id)
        ];
        if (typeof startRevision === 'number') {
          revFilters.push('AND "revision" >= ?');
          revParams.push(startRevision);
        }
        if (typeof endRevision === 'number') {
          revFilters.push('AND "revision" <= ?');
          revParams.push(endRevision);
        }
        revParams.push(limit);

        const base = await db.db.all(
          `SELECT * FROM "match_history_base" WHERE "eventKey" = ? AND "tournamentKey" = ? AND "id" = ? ${revFilters.join(
            ' '
          )} ORDER BY "revision" ASC LIMIT ?;`,
          revParams
        );
        const details = await db.db.all(
          `SELECT * FROM "match_detail_history" WHERE "eventKey" = ? AND "tournamentKey" = ? AND "id" = ? ${revFilters.join(
            ' '
          )} ORDER BY "revision" ASC LIMIT ?;`,
          revParams
        );

        let actions: any[] = [];
        if (includeActions) {
          const actionFilters: string[] = [];
          const actionParams: (string | number)[] = [
            eventKey,
            tournamentKey,
            Number(id)
          ];
          if (typeof startRevision === 'number') {
            actionFilters.push('AND ("revision" IS NULL OR "revision" >= ?)');
            actionParams.push(startRevision);
          }
          if (typeof endRevision === 'number') {
            actionFilters.push('AND ("revision" IS NULL OR "revision" <= ?)');
            actionParams.push(endRevision);
          }
          actionParams.push(limit);
          actions = await db.db.all(
            `SELECT * FROM "match_action_event" WHERE "eventKey" = ? AND "tournamentKey" = ? AND "id" = ? ${actionFilters.join(
              ' '
            )} ORDER BY "occurredAtUtc" ASC, "actionEventId" ASC LIMIT ?;`,
            actionParams
          );
        }

        reply.send({
          key: { eventKey, tournamentKey, id: Number(id) },
          history: { base, details },
          actions
        });
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Record a fine-grained user action from realtime/socket flow.
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/action-event/:eventKey/:tournamentKey/:id',
    {
      schema: {
        params: EventTournamentIdParams,
        body: MatchActionEventBodySchema,
        response: errorableSchema(EmptySchema),
        tags: ['Matches']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey, tournamentKey, id } = request.params as z.infer<
          typeof EventTournamentIdParams
        >;
        const body = request.body as z.infer<typeof MatchActionEventBodySchema>;
        const db = await getDB(eventKey);

        const actorId =
          body.actorId ??
          getHeaderValue(request, 'x-actor-id') ??
          getHeaderValue(request, 'x-user-id');
        const actorName =
          body.actorName ??
          getHeaderValue(request, 'x-actor-name') ??
          getHeaderValue(request, 'x-user-name') ??
          getHeaderValue(request, 'x-username');
        const clientId =
          body.clientId ?? getHeaderValue(request, 'x-client-id');
        const socketId =
          body.socketId ?? getHeaderValue(request, 'x-socket-id');
        const correlationId =
          body.correlationId ?? getHeaderValue(request, 'x-correlation-id');

        await db.db.all(
          'INSERT INTO "match_action_event" ("eventKey", "tournamentKey", "id", "revision", "sourceEvent", "fieldPath", "oldValueJson", "newValueJson", "deltaNumber", "actorId", "actorName", "clientId", "socketId", "correlationId", "occurredAtUtc", "persisted") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
          [
            eventKey,
            tournamentKey,
            Number(id),
            null,
            body.sourceEvent,
            body.fieldPath ?? null,
            body.oldValueJson ?? null,
            body.newValueJson ?? null,
            typeof body.deltaNumber === 'number' ? body.deltaNumber : null,
            actorId ?? null,
            actorName ?? null,
            clientId ?? null,
            socketId ?? null,
            correlationId ?? null,
            body.occurredAtUtc ?? nowUtc(),
            body.persisted ?? 0
          ]
        );

        reply.status(200).send({});
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
        const insertedAt = nowUtc();
        const pureMatches: Match<any>[] = request.body.map((m: Match<any>) => ({
          ...m,
          updatedAtUtc: insertedAt
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
        body: MatchPatchBodySchema,
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
        const match = request.body as z.infer<typeof MatchPatchBodySchema>;
        if (match.details) delete match.details;
        if (match.participants) delete match.participants;
        // Server-owned, like cycleTime below: clients echo back whatever they
        // were last handed, which would pin the timestamp to a stale value.
        delete match.updatedAtUtc;

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

        if (match.redScore == null)
          match.redScore = Number(stored?.redScore ?? 0);
        if (match.blueScore == null)
          match.blueScore = Number(stored?.blueScore ?? 0);
        if (match.redMinPen == null)
          match.redMinPen = Number(stored?.redMinPen ?? 0);
        if (match.redMajPen == null)
          match.redMajPen = Number(stored?.redMajPen ?? 0);
        if (match.blueMinPen == null)
          match.blueMinPen = Number(stored?.blueMinPen ?? 0);
        if (match.blueMajPen == null)
          match.blueMajPen = Number(stored?.blueMajPen ?? 0);

        if (match.active === 1) {
          // Those matches really did change, so they get a new timestamp too.
          await db.updateWhere(
            'match',
            { active: 0, updatedAtUtc: nowUtc() },
            'active = 1 AND fieldNumber = ' + match.fieldNumber
          );
        }

        match.updatedAtUtc = nowUtc();
        const sanitizedMatch = Object.fromEntries(
          Object.entries(match).filter(([, value]) => value !== null)
        ) as Record<string, unknown>;
        await db.updateWhere(
          'match',
          sanitizedMatch,
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`
        );
        await writeMatchRevisionSnapshot(
          db,
          eventKey,
          tournamentKey,
          id,
          makeAuditContext(request, 'MATCH_PATCH')
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
        const sanitizedData = Object.fromEntries(
          Object.entries(data).filter(([, value]) => value !== null)
        );
        await db.updateWhere(
          'match_detail',
          sanitizedData,
          `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`
        );
        await touchMatch(db, eventKey, tournamentKey, id);
        await writeMatchRevisionSnapshot(
          db,
          eventKey,
          tournamentKey,
          id,
          makeAuditContext(request, 'MATCH_DETAILS_PATCH')
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
        await touchMatch(db, eventKey, tournamentKey, id);
        await writeMatchRevisionSnapshot(
          db,
          eventKey,
          tournamentKey,
          id,
          makeAuditContext(request, 'MATCH_PARTICIPANTS_PATCH')
        );
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

          const detailUpdate = funcs?.detailsToJson
            ? funcs.detailsToJson(newDetails)
            : newDetails;
          await db.updateWhere(
            'match_detail',
            detailUpdate,
            `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${m.id}`
          );

          const scoreChanged =
            redScore !== m.redScore || blueScore !== m.blueScore;
          const resultChanged = result !== m.result;
          // Details are rewritten for every examined match, usually with values
          // identical to what was already there. Compare the columns actually
          // being written against the stored row so that a recalculation that
          // changes nothing doesn't bump every match's `updatedAtUtc` and make
          // every consumer re-fetch the whole tournament. Ranking points can
          // move without the score moving, so this can't just key off the score.
          const detailsChanged = Object.entries(
            detailUpdate as Record<string, unknown>
          ).some(([key, value]) => stored[key] !== value);
          if (scoreChanged || resultChanged || detailsChanged) {
            await touchMatch(db, eventKey, tournamentKey, m.id);
          }
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
