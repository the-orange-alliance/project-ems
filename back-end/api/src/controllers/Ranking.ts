import {
  isRankingArray,
  isTeamArray,
  Ranking,
  reconcileTeamRankings,
  Team
} from '@toa-lib/models';
import { NextFunction, Response, Request, Router } from 'express';
import {
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
        `eventKey = ${req.params.eventKey}`
      );
      const teams = await selectAllWhere(
        'team',
        `eventKey = ${req.params.eventKey}`
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

// router.post(
//   '/calculate/:tournamentLevel',
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const tournamentLevel = parseInt(req.params.tournamentLevel);
//       const matches = await selectAllWhere(
//         'match',
//         `tournamentLevel = ${tournamentLevel}`
//       );
//       const participants = await selectAllWhere(
//         'match_participant',
//         `matchKey LIKE "${matchKeyPartial}%"`
//       );
//       const details = await selectAllWhere(
//         'match_detail',
//         `matchKey LIKE "${matchKeyPartial}%"`
//       );
//       const matchesWithParticipants = reconcileMatchParticipants(
//         matches,
//         participants
//       );
//       const matchesWithDetails = reconcileMatchDetails(
//         matchesWithParticipants,
//         details
//       );
//       const prevRankings = await selectAllWhere(
//         'ranking',
//         `tournamentLevel = ${tournamentLevel}`
//       );
//       const isPlayoffs =
//         tournamentLevel === ROUND_ROBIN_LEVEL ||
//         tournamentLevel === FINALS_LEVEL;
//       const members = await selectAllWhere(
//         'alliance',
//         `tournamentLevel = ${tournamentLevel}`
//       );
//       const rankings = isPlayoffs
//         ? calculatePlayoffsRank(matchesWithDetails, prevRankings, members)
//         : calculateRankings(matchesWithDetails, prevRankings);
//       await deleteWhere('ranking', `tournamentLevel = ${tournamentLevel}`);
//       await insertValue('ranking', rankings);
//       res.send(rankings);
//     } catch (e) {
//       return next(e);
//     }
//   }
// );

export default router;
