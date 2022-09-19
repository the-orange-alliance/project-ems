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
import { execFile } from 'child_process';
import { writeFile } from 'fs/promises';
import { getAppData } from '@toa-lib/server';

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
      const contents = req.body.teamKeys.toString().replace(',', '\n');
      await writeFile(teamsPath, contents);
      const matchMakerArgs = [
        '-l',
        teamsPath,
        '-t',
        config.teamsParticipating,
        '-r',
        config.matchesPerTeam,
        '-a',
        config.teamsPerAlliance,
        getArgFromQualityStr(config.quality),
        '-s',
        'o'
      ];
    } catch (e) {}
  }
);

export default router;
