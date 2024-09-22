import {
  MatchKey,
  reconcileMatchDetails,
  reconcileMatchParticipants,
  reconcileTeamRankings,
  SyncPlatform,
  Team
} from '@toa-lib/models';
import { environment } from '@toa-lib/server';
import { NextFunction, Request, Response, Router } from 'express';
import fetch, { RequestInit } from 'node-fetch';
import { getDB } from '../db/EventDatabase.js';
import logger from '../util/Logger.js';

const router = Router();

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
}

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
      `eventKey = "${info.eventKey}" AND tournamentKey = "${info.tournamentKey}" AND id = ${info.id}`)
  }

  return await postRankings(
    info.eventKey,
    info.tournamentKey,
    platform,
    apiKey
  );
};

router.post(
  '/sync/rankings/:eventKey/:tournamentKey',
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info(
      environment.isProd()
        ? 'attempting to sync rankings'
        : 'not syncing ranking'
    );
    if (!environment.isProd()) return res.send({ success: false });
    const { eventKey, tournamentKey } = req.params;
    const { platform, apiKey } = req.body;
    const rankingsReq = await postRankings(
      eventKey,
      tournamentKey,
      platform,
      apiKey
    );
    res.send({ success: rankingsReq?.ok });
  }
);

router.post(
  '/sync/matches/:eventKey/:tournamentKey/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info(
      environment.isProd()
        ? 'attempting to sync results'
        : 'not syncing results'
    );
    if (!environment.isProd()) return res.send({ succuess: false });
    const { eventKey, tournamentKey, id: idStr } = req.params;
    const id = parseInt(idStr);
    const { platform, apiKey } = req.body;
    const matchesReq = await postMatchResults(
      { eventKey, tournamentKey, id },
      platform,
      apiKey
    );
    res.send({ succuess: matchesReq?.ok });
  }
);

router.post(
  '/sync/matches/:eventKey/:tournamentKey',
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info(
      environment.isProd()
        ? 'attempting to sync results'
        : 'not syncing results'
    );
    if (!environment.isProd()) return res.send({ success: false });
    const { eventKey, tournamentKey } = req.params;
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

    res.send({ success: matchesReq?.ok });
  }
);

router.post(
  '/sync/teams/:eventKey',
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info(
      environment.isProd()
        ? 'attempting to sync results'
        : 'not syncing results'
    );
    if (!environment.isProd()) return res.send({ succuess: false });
    const { eventKey } = req.params;
    const db = await getDB(eventKey);
    const teams = await db.selectAll('team');
    const { platform, apiKey } = req.body;
    const teamsReq = await postTeams(
      teams,
      platform,
      apiKey
    );
    res.send({ succuess: teamsReq?.ok });
  }
);

export default router;
