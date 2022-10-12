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

router.post(
  '/sync/all',
  async (req: Request, res: Response, next: NextFunction) => {
    const [rankingsRaw, teams] = await Promise.all([
      selectAllWhere(
        'ranking',
        `tournamentLevel = ${getTournamentLevelFromType('Qualification')}`
      ),
      selectAll('team')
    ]);
    const teamsReq = await request('/upload/teams', {
      method: 'POST',
      body: JSON.stringify(teams)
    });
    const rankings = reconcileTeamRankings(teams, rankingsRaw);
    const rankingsReq = await request('/upload/rankings', {
      method: 'POST',
      body: JSON.stringify(rankings)
    });

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

    res.send({ success: teamsReq.ok && rankingsReq.ok && matchesReq.ok });
  }
);

export default router;
