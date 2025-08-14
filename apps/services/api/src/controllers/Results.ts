import {
  AllianceMember,
  MatchKey,
  reconcileMatchDetails,
  reconcileMatchParticipants,
  reconcileTeamRankings,
  SyncPlatform,
  Team
} from '@toa-lib/models';
import { environment } from '@toa-lib/server';
import { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import fetch, { RequestInit } from 'node-fetch';
import { getDB } from '../db/EventDatabase.js';
import logger from '../util/Logger.js';
import { z } from 'zod';
import { errorableSchema } from '../util/Errors.js';
import { EventKeyParams, EventTournamentKeyParams, EventTournamentIdParams, EmptySchema, SuccessSchema } from '../util/GlobalSchema.js';


const SyncSettings = z.object({ platform: z.nativeEnum(SyncPlatform), apiKey: z.string() });

const getUrlByPlatform = (platform: SyncPlatform) => {
  switch (platform) {
    case SyncPlatform.FGC:
      return 'https://api.first.global';
    default:
      return '';
  }
};

const request = (
  path: string,
  options: RequestInit,
  platform: SyncPlatform,
  apiKey: string
) => {
  if (platform === SyncPlatform.DISABLED) return;
  return fetch(getUrlByPlatform(platform) + path, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });
};

export const postRankings = async (
  eventKey: string,
  tournamentKey: string,
  platform: SyncPlatform,
  apiKey: string
) => {
  const db = await getDB(eventKey);
  const [rankingsRaw, teams] = await Promise.all([
    db.selectAllWhere(
      'ranking',
      `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
    ),
    db.selectAllWhere('team', `eventKey = "${eventKey}"`)
  ]);
  await request(
    '/upload/teams',
    {
      method: 'POST',
      body: JSON.stringify(teams)
    },
    platform,
    apiKey
  );

  const rankings = reconcileTeamRankings(teams, rankingsRaw);
  return await request(
    '/upload/rankings',
    {
      method: 'POST',
      body: JSON.stringify(rankings)
    },
    platform,
    apiKey
  );
};

export const postTeams = async (
  teams: Team[],
  platform: SyncPlatform,
  apiKey: string
) => {
  return await request(
    '/upload/teams',
    {
      method: 'POST',
      body: JSON.stringify(teams)
    },
    platform,
    apiKey
  );
};

export const postMatchResults = async (
  info: MatchKey,
  platform: SyncPlatform,
  apiKey: string
) => {
  const db = await getDB(info.eventKey);
  const [match] = await db.selectAllWhere(
    'match',
    `eventKey = "${info.eventKey}" AND tournamentKey = "${info.tournamentKey}" AND id = ${info.id}`
  );
  const participants = await db.selectAllWhere(
    'match_participant',
    `eventKey = "${info.eventKey}" AND
    tournamentKey = "${info.tournamentKey}" AND id = ${info.id}`
  );
  const [details] = await db.selectAllWhere(
    'match_detail',
    `eventKey = "${info.eventKey}" AND tournamentKey = "${info.tournamentKey}" AND id = ${info.id}`
  );
  match.participants = participants;
  match.details = details;

  const res = await request(
    '/upload/matches',
    {
      method: 'PUT',
      body: JSON.stringify([match])
    },
    platform,
    apiKey
  );

  if (res?.ok) {
    await db.updateWhere(
      'match',
      { uploaded: 1 },
      `eventKey = "${info.eventKey}" AND tournamentKey = "${info.tournamentKey}" AND id = ${info.id}`
    );
  }

  return await postRankings(
    info.eventKey,
    info.tournamentKey,
    platform,
    apiKey
  );
};

export const postAlliances = async (
  alliances: AllianceMember[],
  platform: SyncPlatform,
  apiKey: string
) => {
  return await request(
    '/upload/alliances',
    {
      method: 'POST',
      body: JSON.stringify(alliances)
    },
    platform,
    apiKey
  );
};

async function resultsController(fastify: FastifyInstance) {
  // Sync rankings
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/sync/rankings/:eventKey/:tournamentKey',
    { schema: { params: EventTournamentKeyParams, body: SyncSettings, response: errorableSchema<typeof SuccessSchema>(SuccessSchema), tags: ['Results'] } },
    async (req, reply) => {
      logger.info(
        environment.isProd()
          ? 'attempting to sync rankings'
          : 'not syncing ranking'
      );
      if (!environment.isProd()) {
        reply.send({ success: false });
        return;
      }
      const { eventKey, tournamentKey } = req.params as z.infer<typeof EventTournamentKeyParams>;
      const { platform, apiKey } = req.body;
      const rankingsReq = await postRankings(
        eventKey,
        tournamentKey,
        platform,
        apiKey
      );
      reply.send({ success: rankingsReq?.ok });
    }
  );

  // Sync match by id
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/sync/matches/:eventKey/:tournamentKey/:id',
    { schema: { params: EventTournamentIdParams, body: SyncSettings, response: errorableSchema<typeof SuccessSchema>(SuccessSchema), tags: ['Results'] } },
    async (req, reply) => {
      logger.info(
        environment.isProd()
          ? 'attempting to sync results'
          : 'not syncing results'
      );
      if (!environment.isProd()) {
        reply.send({ success: false });
        return;
      }
      const { eventKey, tournamentKey, id: idStr } = req.params as z.infer<typeof EventTournamentIdParams>;
      const id = parseInt(idStr);
      const { platform, apiKey } = req.body;
      const matchesReq = await postMatchResults(
        { eventKey, tournamentKey, id },
        platform,
        apiKey
      );
      reply.send({ success: matchesReq?.ok });
    }
  );

  // Sync all matches
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/sync/matches/:eventKey/:tournamentKey',
    { schema: { params: EventTournamentKeyParams, body: SyncSettings, response: errorableSchema<typeof SuccessSchema>(SuccessSchema), tags: ['Results'] } },
    async (req, reply) => {
      logger.info(
        environment.isProd()
          ? 'attempting to sync results'
          : 'not syncing results'
      );
      if (!environment.isProd()) {
        reply.send({ success: false });
        return;
      }
      const { eventKey, tournamentKey } = req.params as z.infer<typeof EventTournamentKeyParams>;
      const db = await getDB(eventKey);
      const matches = await db.selectAllWhere(
        'match',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
      );
      const participants = await db.selectAllWhere(
        'match_participant',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
      );
      const details = await db.selectAllWhere(
        'match_detail',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
      );
      const matchesWithParticipants = reconcileMatchParticipants(
        matches,
        participants
      );
      const matchesWithDetails = reconcileMatchDetails(
        matchesWithParticipants,
        details
      );
      const { platform, apiKey } = req.body;
      const matchesReq = await request(
        '/upload/matches',
        {
          method: 'PUT',
          body: JSON.stringify(matchesWithDetails)
        },
        platform,
        apiKey
      );
      reply.send({ success: matchesReq?.ok });
    }
  );

  // Sync teams
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/sync/teams/:eventKey',
    { schema: { params: EventKeyParams, body: SyncSettings, response: errorableSchema<typeof SuccessSchema>(SuccessSchema), tags: ['Results'] } },
    async (req, reply) => {
      logger.info(
        environment.isProd()
          ? 'attempting to sync results'
          : 'not syncing results'
      );
      if (!environment.isProd()) {
        reply.send({ success: false });
        return;
      }
      const { eventKey } = req.params as z.infer<typeof EventKeyParams>;
      const db = await getDB(eventKey);
      const teams = await db.selectAll('team');
      const { platform, apiKey } = req.body;
      const teamsReq = await postTeams(teams, platform, apiKey);
      reply.send({ success: teamsReq?.ok });
    }
  );

  // Sync alliances
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/sync/alliances/:eventKey/:tournamentKey',
    { schema: { params: EventTournamentKeyParams, body: SyncSettings, response: errorableSchema<typeof SuccessSchema>(SuccessSchema), tags: ['Results'] } },
    async (req, reply) => {
      logger.info(
        environment.isProd()
          ? 'attempting to sync results'
          : 'not syncing results'
      );
      if (!environment.isProd()) {
        reply.send({ success: false });
        return;
      }
      const { eventKey, tournamentKey } = req.params as z.infer<typeof EventTournamentKeyParams>;
      const { platform, apiKey } = req.body;
      const db = await getDB(eventKey);
      const alliances = await db.selectAllWhere(
        'alliance',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
      );
      const allianceReq = await postAlliances(alliances, platform, apiKey);
      reply.send({ success: allianceReq?.ok });
    }
  );
}

export default resultsController;
