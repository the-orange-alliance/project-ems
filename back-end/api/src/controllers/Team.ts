import { isTeam, isTeamArray } from '@toa-lib/models';
import { NextFunction, Response, Request, Router } from 'express';
import {
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
    const data = await selectAll('team');
    res.send(data);
  } catch (e) {
    return next(e);
  }
});

router.get(
  '/:teamKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await selectAllWhere(
        'team',
        `teamKey = ${req.params.teamKey}`
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
  validateBody(isTeamArray),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await insertValue('team', req.body);
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.patch(
  '/:teamKey',
  validateBody(isTeam),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await updateWhere('team', req.body, `teamKey = "${req.params.teamKey}"`);
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
