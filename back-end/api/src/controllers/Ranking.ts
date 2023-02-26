import {
  calculateCUsRankings,
  isRankingArray,
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
  selectAllJoinWhere,
  selectAllWhere
} from '../db/Database.js';
import { validateBody } from '../middleware/BodyValidator.js';

const router = Router();

router.get(
  '/:eventKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rankings = await selectAllWhere(
        'ranking',
        `eventKey = "${req.params.eventKey}"`
      );
      const teams = await selectAllWhere(
        'team',
        `eventKey = "${req.params.eventKey}"`
      );
      res.send(reconcileTeamRankings(teams, rankings));
    } catch (e) {
      return next(e);
    }
  }
);

router.get(
  '/:eventKey/:tournamentKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rankings = await selectAllWhere(
        'ranking',
        `eventKey = "${req.params.eventKey}" AND tournamentKey = "${req.params.tournamentKey}"`
      );
      const teams = await selectAllWhere(
        'team',
        `eventKey = "${req.params.eventKey}" AND tournamentKey = "${req.params.tournamentKey}"`
      );
      res.send(reconcileTeamRankings(teams, rankings));
    } catch (e) {
      return next(e);
    }
  }
);

router.get(
  '/:eventKey/:tournamentKey/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey, tournamentKey, id } = req.params;
      const rankings = await selectAllJoinWhere(
        'ranking',
        'match_participant',
        'teamKey',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = ${id}`
      );
      res.send(rankings);
    } catch (e) {
      return next(e);
    }
  }
);

router.post(
  '/',
  validateBody(isRankingArray),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await insertValue('ranking', req.body);
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.post(
  '/create/:tournamentKey',
  validateBody(isTeamArray),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tournamentKey } = req.params;
      const teams: Team[] = req.body;
      const rankings: Ranking[] = teams.map((t) => ({
        eventKey: t.eventKey,
        tournamentKey,
        rank: 0,
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
  '/calculate/:eventKey/:tournamentKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey, tournamentKey } = req.params;
      const matches = await selectAllWhere(
        'match',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
      );
      const participants = await selectAllWhere(
        'match_participant',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
      );
      const details = await selectAllWhere(
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
      const prevRankings = await selectAllWhere(
        'ranking',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
      );
      const rankings = calculateCUsRankings(matchesWithDetails, prevRankings);
      await deleteWhere(
        'ranking',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
      );
      await insertValue('ranking', rankings);
      res.send(rankings);
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
