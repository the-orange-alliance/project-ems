import {
  ChargedUpDetails,
  ChargedUpRanking,
  getFunctionsBySeasonKey,
  getSeasonKeyFromEventKey,
  isRankingArray,
  isTeamArray,
  Ranking,
  reconcileMatchDetails,
  reconcileMatchParticipants,
  reconcileTeamRankings,
  Team
} from '@toa-lib/models';
import { NextFunction, Response, Request, Router } from 'express';
import { getDB } from '../db/EventDatabase.js';
import { validateBody } from '../middleware/BodyValidator.js';
import { SeasonFunctionsMissing } from '../util/Errors.js';

const router = Router();

router.get(
  '/:eventKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey } = req.params;
      const db = await getDB(eventKey);
      const rankings = await db.selectAllWhere(
        'ranking',
        `eventKey = "${eventKey}"`
      );
      const teams = await db.selectAllWhere('team', `eventKey = "${eventKey}"`);
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
      const { eventKey, tournamentKey } = req.params;
      const db = await getDB(eventKey);
      const rankings = await db.selectAllWhere(
        'ranking',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
      );
      const teams = await db.selectAllWhere('team', `eventKey = "${eventKey}"`);
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
      const db = await getDB(eventKey);
      const rankings = await db.selectAllJoinWhere(
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
      const eventKey = req.body[0].eventKey;
      const db = await getDB(eventKey);
      await db.insertValue('ranking', req.body);
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
      const db = await getDB(teams[0].eventKey);
      await db.insertValue('ranking', rankings);
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
      const prevRankings = await db.selectAllWhere(
        'ranking',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
      );

      const seasonKey = getSeasonKeyFromEventKey(eventKey);
      const functions = getFunctionsBySeasonKey<
        ChargedUpDetails,
        ChargedUpRanking
      >(seasonKey);

      if (!functions) {
        return next(SeasonFunctionsMissing);
      }

      // TODO [FGC2023] - Calculate rankings for playoffs matches
      const rankings = functions.calculateRankings(
        matchesWithDetails,
        prevRankings
      );
      await db.deleteWhere(
        'ranking',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
      );
      await db.insertValue('ranking', rankings);
      res.send(rankings);
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
