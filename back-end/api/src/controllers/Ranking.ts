import {
  isTeamArray,
  reconcileMatchParticipants,
  Team,
  TournamentType
} from '@toa-lib/models';
import { calculateRankings } from '@toa-lib/models/build/details/CarbonCapture';
import {
  getMatchKeyPartialFromType,
  reconcileMatchDetails
} from '@toa-lib/models/build/Match';
import { Ranking, reconcileTeamRankings } from '@toa-lib/models/build/Ranking';
import { NextFunction, Response, Request, Router } from 'express';
import {
  deleteWhere,
  insertValue,
  selectAll,
  selectAllWhere,
  updateWhere
} from '../db/Database';
import { validateBody } from '../middleware/BodyValidator';

const router = Router();

router.get(
  '/:partial',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rankings = await selectAllWhere(
        'ranking',
        `rankKey LIKE ${req.params.partial}%`
      );
      const teams = await selectAll('team');
      res.send(reconcileTeamRankings(teams, rankings));
    } catch (e) {
      return next(e);
    }
  }
);

router.post(
  '/create/:type',
  validateBody(isTeamArray),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = getMatchKeyPartialFromType(
        req.params.type as TournamentType
      );
      const teams: Team[] = req.body;
      const eventKeyArgs = teams[0].eventParticipantKey.split('-');
      eventKeyArgs.pop();
      const eventKey = eventKeyArgs.toString().replace(/,/g, '-');
      const rankings: Ranking[] = teams.map((t) => ({
        rankKey: `${eventKey}-${type}-${t.teamKey}`,
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
  '/calculate/:partial',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const partial = req.params.partial;
      const type = '';
      const matches = await selectAllWhere(
        'match',
        `matchKey LIKE ${partial}%`
      );
      const participants = await selectAllWhere(
        'match_participant',
        `matchKey LIKE ${partial}%`
      );
      const details = await selectAllWhere(
        'match_detail',
        `matchKey LIKE ${partial}%`
      );
      const matchesWithParticipants = reconcileMatchParticipants(
        matches,
        participants
      );
      const matchesWithDetails = reconcileMatchDetails(
        matchesWithParticipants,
        details
      );
      const prevRankings = await selectAllWhere('ranking', `rankKey LIKE%`);
      const rankings = calculateRankings(matchesWithDetails, prevRankings);
      await deleteWhere('ranking', `rankKey LIKE%`);
      await insertValue('ranking', rankings);
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
