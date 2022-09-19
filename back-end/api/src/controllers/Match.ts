import { isMatchMakerRequest, MatchMakerParams } from '@toa-lib/models';
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
    const data = await selectAll('match');
    res.send(data);
  } catch (e) {
    return next(e);
  }
});

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

// router.post(
//   '/',
//   validateBody(isTeamArray),
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       await insertValue('match', req.body);
//       res.status(200).send({});
//     } catch (e) {
//       return next(e);
//     }
//   }
// );

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
