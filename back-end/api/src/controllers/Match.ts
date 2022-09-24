import {
  isMatchArray,
  isMatchMakerRequest,
  MatchMakerParams,
  Match,
  MatchParticipant,
  MatchDetailBase,
  getTournamentLevelFromType,
  TournamentType
} from '@toa-lib/models';
import { NextFunction, Response, Request, Router } from 'express';
import {
  insertValue,
  selectAll,
  selectAllWhere,
  updateWhere
} from '../db/Database';
import { validateBody } from '../middleware/BodyValidator';
import { DataNotFoundError } from '../util/Errors';
import { join } from 'path';
import { writeFile } from 'fs/promises';
import {
  executeMatchMaker,
  getAppData,
  getArgFromQualityStr
} from '@toa-lib/server';
import logger from '../util/Logger';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.query.tournamentLevel) {
      const data = await selectAllWhere(
        'match',
        `tournamentLevel = ${req.query.tournamentLevel}`
      );
      res.send(data);
    } else if (req.query.type) {
      const data = await selectAllWhere(
        'match',
        `tournamentLevel = ${getTournamentLevelFromType(
          req.query.type as TournamentType
        )}`
      );
      res.send(data);
    } else {
      const data = await selectAll('match');
      res.send(data);
    }
  } catch (e) {
    return next(e);
  }
});

router.get(
  '/participants',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.query.matchKeyPartial) {
        const data = await selectAllWhere(
          'match_participant',
          `matchKey LIKE "${req.query.matchKeyPartial}%"`
        );
        res.send(data);
      }
    } catch (e) {
      return next(e);
    }
  }
);

router.get(
  '/all/:matchKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const matchKey = req.params.matchKey;
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

      res.send(match);
    } catch (e) {
      return next(e);
    }
  }
);

router.get(
  '/:matchKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await selectAllWhere(
        'match',
        `matchKey = ${req.params.matchKey}`
      );
      if (!data) {
        return next(DataNotFoundError);
      }
      res.send(data);
    } catch (e) {
      return next(e);
    }
  }
);

router.post(
  '/',
  validateBody(isMatchArray),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pureMatches: Match[] = req.body.map((m: Match) => ({
        ...m
      }));
      for (const match of pureMatches) delete match.participants;
      const participants = req.body
        .map((match: Match) => match.participants || [])
        .flat();
      const details: MatchDetailBase[] = req.body.map((match: Match) => ({
        matchKey: match.matchKey,
        matchDetailKey: match.matchDetailKey
      }));
      await insertValue('match', pureMatches);
      await insertValue('match_participant', participants);
      await insertValue('match_detail', details);
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

// router.patch(
//   '/:matchKey',
//   validateBody(isTeam),
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       await updateWhere(
//         'match',
//         req.body,
//         `matchKey = "${req.params.matchKey}"`
//       );
//       res.status(200).send({});
//     } catch (e) {
//       return next(e);
//     }
//   }
// );

/** SPECIAL ROUTES */
router.post(
  '/create',
  validateBody(isMatchMakerRequest),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const matchMakerPath = join(__dirname, '../../bin/MatchMaker.exe');
      // First we have to make the teamlist for matchmaker
      const config: MatchMakerParams = req.body;
      const teamsPath = join(getAppData('ems'), `${config.type}-teams.txt`);
      const contents = config.teamKeys.toString().replace(/,/g, '\n');
      await writeFile(teamsPath, contents);
      logger.info(`wrote teams file at ${teamsPath}`);
      const matchMakerArgs = [
        '-l',
        teamsPath,
        '-t',
        config.teamsParticipating.toString(),
        '-r',
        config.matchesPerTeam.toString(),
        '-a',
        config.teamsPerAlliance.toString(),
        getArgFromQualityStr(config.quality),
        '-s',
        '-o'
      ];
      logger.info(
        `executing matchmaker (${matchMakerPath}) with arguments ${matchMakerArgs.toString()}`
      );
      const matches = await executeMatchMaker(
        matchMakerPath,
        matchMakerArgs,
        config
      );
      logger.info('mathmaker complete - sending results');
      res.send(matches);
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
