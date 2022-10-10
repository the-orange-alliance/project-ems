import { isScheduleItemArray, isTeam, isTeamArray } from '@toa-lib/models';
import { NextFunction, Response, Request, Router } from 'express';
import {
  deleteWhere,
  insertValue,
  selectAll,
  selectAllWhere,
  updateWhere
} from '../db/Database.js';
import { validateBody } from '../middleware/BodyValidator.js';
import { DataNotFoundError } from '../util/Errors.js';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await selectAll('schedule');
    res.send(data);
  } catch (e) {
    return next(e);
  }
});

router.get(
  '/:type',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await selectAllWhere(
        'schedule',
        `type = '${req.params.type}'`
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
  validateBody(isScheduleItemArray),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await insertValue('schedule', req.body);
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.delete(
  '/:type',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteWhere('schedule', `type = "${req.params.type}"`);
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.patch(
  '/:scheduleKey',
  validateBody(isTeam),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await updateWhere(
        'schedule',
        req.body,
        `scheduleKey = "${req.params.scheduleKey}"`
      );
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
