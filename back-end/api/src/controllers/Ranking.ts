import {
  calculateRankings,
  getMatchKeyPartialFromKey,
  isTeamArray,
  Ranking,
  reconcileMatchDetails,
  reconcileMatchParticipants,
  reconcileTeamRankings,
  Team
} from '@toa-lib/models';
import { NextFunction, Response, Request, Router } from 'express';
import {
  deleteWhere,
  insertValue,
  selectAll,
  selectAllWhere,
  updateWhere
} from '../db/Database';
import { validateBody } from '../middleware/BodyValidator';
import { DataNotFoundError } from '../util/Errors';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.query.tournamentLevel) {
      const rankings = await selectAllWhere(
        'ranking',
        `tournamentLevel = ${req.query.tournamentLevel}`
      );
      const teams = await selectAll('team');
      res.send(reconcileTeamRankings(teams, rankings));
    } else {
      return next(DataNotFoundError);
    }
  } catch (e) {
    return next(e);
  }
});

router.post(
  '/create/:tournamentLevel',
  validateBody(isTeamArray),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tournamentLevel = req.params.tournamentLevel;
      const teams: Team[] = req.body;
      const eventKeyArgs = teams[0].eventParticipantKey.split('-');
      eventKeyArgs.pop();
      const eventKey = eventKeyArgs.toString().replace(/,/g, '-');
      const rankings: Ranking[] = teams.map((t) => ({
        rankKey: `${eventKey}-${tournamentLevel}-${t.teamKey}`,
        tournamentLevel: parseInt(tournamentLevel),
        rank: 0,
        allianceKey: '',
        losses: 0,
        played: 0,
        rankChange: 0,
        teamKey: t.teamKey,
        ties: 0,
        wins: 0
      }));
      await insertValue('ranking', rankings);
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.post(
  '/calculate/:tournamentLevel',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tournamentLevel = req.params.tournamentLevel;
      const matches = await selectAllWhere(
        'match',
        `tournamentLevel = ${tournamentLevel}`
      );
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
      const prevRankings = await selectAllWhere(
        'ranking',
        `tournamentLevel = ${tournamentLevel}`
      );
      const rankings = calculateRankings(matchesWithDetails, prevRankings);
      await deleteWhere('ranking', `tournamentLevel = ${tournamentLevel}`);
      await insertValue('ranking', rankings);
      res.send(rankings);
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
