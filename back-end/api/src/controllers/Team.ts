import { isTeam, isTeamArray } from '@toa-lib/models';
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
    const data = await selectAll('team');
    res.send(data);
  } catch (e) {
    return next(e);
  }
});

router.get(
  '/:eventKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await selectAllWhere(
        'team',
        `eventKey = "${req.params.eventKey}"`
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
  '/:eventKey/:teamKey',
  validateBody(isTeam),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey, teamKey } = req.params;
      await updateWhere(
        'team',
        req.body,
        `eventKey = "${eventKey}" AND teamKey = "${teamKey}"`
      );
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.delete(
  '/:eventKey/:teamKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey, teamKey } = req.params;
      const data = await deleteWhere(
        'team',
        `eventKey = "${eventKey}" AND teamKey = ${teamKey}`
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

export default router;
