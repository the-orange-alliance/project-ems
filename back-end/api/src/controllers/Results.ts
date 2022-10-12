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

const request = (path: string, data: RequestInit) =>
  fetch(environment.get().resultsApiBaseUrl + path, {
    ...data,
    headers: {
      Authorization: `Bearer ${environment.get().resultsApiKey}`,
      'Content-Type': 'application/json',
      ...data?.headers
    }
  });

export const postRankings = async () => {
  const [rankingsRaw, teams] = await Promise.all([
    selectAllWhere(
      'ranking',
      `tournamentLevel = ${getTournamentLevelFromType('Qualification')}`
    ),
    selectAll('team')
  ]);
  await request('/upload/teams', {
    method: 'POST',
    body: JSON.stringify(teams)
  });

  const rankings = reconcileTeamRankings(teams, rankingsRaw);
  await request('/upload/rankings', {
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

  await postRankings();
};

router.post(
  '/sync/all',
  async (req: Request, res: Response, next: NextFunction) => {
    await postRankings();

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
