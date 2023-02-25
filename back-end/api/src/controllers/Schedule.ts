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
  '/:eventKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await selectAllWhere(
        'schedule',
        `eventKey = '${req.params.eventKey}'`
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

router.get(
  '/:eventKey/:tournamentKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await selectAllWhere(
        'schedule',
        `eventKey = "${req.params.eventKey}" AND tournamentKey = "${req.params.tournamentKey}"`
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
  '/:eventKey/:tournamentKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteWhere(
        'schedule',
        `eventKey = "${req.params.eventKey}" AND tournamentKey = "${req.params.tournamentKey}"`
      );
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.patch(
  '/:eventKey/:tournamentKey/:id',
  validateBody(isTeam),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await updateWhere(
        'schedule',
        req.body,
        `eventKey = "${req.params.eventKey}" AND tournamentKey = "${req.params.eventKey}" AND id = "${req.params.id}"`
      );
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
