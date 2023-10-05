import {
  MatchKey,
  reconcileMatchDetails,
  reconcileMatchParticipants,
  reconcileTeamRankings
} from '@toa-lib/models';
import { environment } from '@toa-lib/server';
import { NextFunction, Request, Response, Router } from 'express';
import fetch, { RequestInit } from 'node-fetch';
import { getDB } from '../db/EventDatabase.js';

const router = Router();

const request = (path: string, options: RequestInit) =>
  fetch(environment.get().resultsApiBaseUrl + path, {
    ...options,
    headers: {
      Authorization: `Bearer ${environment.get().resultsApiKey}`,
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

export const postRankings = async (eventKey: string, tournamentKey: string) => {
  const db = await getDB(eventKey);
  const [rankingsRaw, teams] = await Promise.all([
    db.selectAllWhere(
      'ranking',
      `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
    ),
    db.selectAllWhere('team', `eventKey = "${eventKey}"`)
  ]);
  await request('/upload/teams', {
    method: 'POST',
    body: JSON.stringify(teams)
  });

  const rankings = reconcileTeamRankings(teams, rankingsRaw);
  return await request('/upload/rankings', {
    method: 'POST',
    body: JSON.stringify(rankings)
  });
};

export const postMatchResults = async (info: MatchKey) => {
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

  await request('/upload/matches', {
    method: 'PUT',
    body: JSON.stringify([match])
  });

  return await postRankings(info.eventKey, info.tournamentKey);
};

router.post(
  '/sync/rankings/:eventKey/:tournamentKey',
  async (req: Request, res: Response, next: NextFunction) => {
    // if (!environment.isProd()) return res.send({ success: false });
    const { eventKey, tournamentKey } = req.params;
    const rankingsReq = await postRankings(eventKey, tournamentKey);
    res.send({ success: rankingsReq.ok });
  }
);

router.post(
  '/sync/matches/:eventKey/:tournamentKey/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    // if (!environment.isProd()) return res.send({ succuess: false });
    const { eventKey, tournamentKey, id: idStr } = req.params;
    const id = parseInt(idStr);
    const matchesReq = await postMatchResults({ eventKey, tournamentKey, id });
    res.send({ succuess: matchesReq.ok });
  }
);

router.post(
  '/sync/matches/:eventKey/:tournamentKey',
  async (req: Request, res: Response, next: NextFunction) => {
    // if (!environment.isProd()) return res.send({ success: false });
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
    const matchesReq = await request('/upload/matches', {
      method: 'POST',
      body: JSON.stringify(matchesWithDetails)
    });

    res.send({ success: matchesReq.ok });
  }
);

export default router;
