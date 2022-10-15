import {
  calculateRankings,
  calculatePlayoffsRank,
  FINALS_LEVEL,
  getMatchKeyPartialFromKey,
  isRankingArray,
  isTeamArray,
  Ranking,
  reconcileMatchDetails,
  reconcileMatchParticipants,
  reconcileTeamRankings,
  ROUND_ROBIN_LEVEL,
  Team
} from '@toa-lib/models';
import { NextFunction, Response, Request, Router } from 'express';
import {
  deleteWhere,
  insertValue,
  selectAll,
  selectAllJoinWhere,
  selectAllWhere
} from '../db/Database.js';
import { validateBody } from '../middleware/BodyValidator.js';
import { DataNotFoundError } from '../util/Errors.js';

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

router.get(
  '/:matchKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const matchKey = req.params.matchKey;
      const [match] = await selectAllWhere('match', `matchKey = "${matchKey}"`);
      const tournamentLevel = match.tournamentLevel;
      const rankings = await selectAllJoinWhere(
        'ranking',
        'match_participant',
        'teamKey',
        `matchKey = "${matchKey}" AND tournamentLevel = ${tournamentLevel}`
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
      const tournamentLevel = parseInt(req.params.tournamentLevel);
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
      const isPlayoffs =
        tournamentLevel === ROUND_ROBIN_LEVEL ||
        tournamentLevel === FINALS_LEVEL;
      const members = await selectAllWhere(
        'alliance',
        `tournamentLevel = ${tournamentLevel}`
      );
      const rankings = isPlayoffs
        ? calculatePlayoffsRank(matchesWithDetails, prevRankings, members)
        : calculateRankings(matchesWithDetails, prevRankings);
      await deleteWhere('ranking', `tournamentLevel = ${tournamentLevel}`);
      await insertValue('ranking', rankings);
      res.send(rankings);
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
