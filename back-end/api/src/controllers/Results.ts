import {
  getMatchKeyPartialFromKey,
  getTournamentLevelFromType,
  reconcileMatchDetails,
  reconcileMatchParticipants,
  reconcileTeamRankings
} from '@toa-lib/models';
import { environment } from '@toa-lib/server';
import { NextFunction, Request, Response, Router } from 'express';
import fetch, { RequestInit } from 'node-fetch';
import { selectAll, selectAllWhere } from '../db/Database.js';

const router = Router();

const request = (path: string, options: RequestInit) =>
  fetch.default(environment.get().resultsApiBaseUrl + path, {
    ...options,
    headers: {
      Authorization: `Bearer ${environment.get().resultsApiKey}`,
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

export const postRankings = async (tournamentLevel: number) => {
  const [rankingsRaw, teams] = await Promise.all([
    selectAllWhere('ranking', `tournamentLevel = ${tournamentLevel}`),
    selectAll('team')
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

export const postMatchResults = async (matchKey: string) => {
  const [match] = await selectAllWhere('match', `matchKey = "${matchKey}"`);
  const participants = await selectAllWhere(
    'match_participant',
    `matchKey = "${matchKey}"`
  );
  const [details] = await selectAllWhere(
    'match_detail',
    `matchKey = "${matchKey}"`
  );
  match.participants = participants;
  match.details = details;

  await request('/upload/matches', {
    method: 'PUT',
    body: JSON.stringify([match])
  });

  await postRankings(match.tournamentLevel);
};

router.post(
  '/sync/rankings/:tournamentLevel',
  async (req: Request, res: Response, next: NextFunction) => {
    if (!environment.isProd()) return res.send({ success: false });
    const rankingsReq = await postRankings(
      parseInt(req.params.tournamentLevel)
    );
    res.send({ success: rankingsReq.ok });
  }
);

router.post(
  '/sync/matches',
  async (req: Request, res: Response, next: NextFunction) => {
    if (!environment.isProd()) return res.send({ success: false });

    const matches = await selectAll('match');
    const matchKeyPartial = getMatchKeyPartialFromKey(matches[0].matchKey);
    const participants = await selectAllWhere(
      'match_participant',
      `matchKey LIKE "${matchKeyPartial}%"`
    );
    const details = await selectAllWhere(
      'match_detail',
      `matchKey LIKE "${matchKeyPartial}%"`
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
