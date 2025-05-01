import { scheduleItemZod, teamZod } from '@toa-lib/models';
import { NextFunction, Response, Request, Router } from 'express';
import { getDB } from '../db/EventDatabase.js';
import { validateBodyZ } from '../middleware/BodyValidator.js';
import { DataNotFoundError } from '../util/Errors.js';

const router = Router();

router.get(
  '/:eventKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey } = req.params;
      const db = await getDB(eventKey);
      const data = await db.selectAllWhere(
        'schedule',
        `eventKey = '${eventKey}'`
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
      const { eventKey, tournamentKey } = req.params;
      const db = await getDB(eventKey);
      const data = await db.selectAllWhere(
        'schedule',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
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
  validateBodyZ(scheduleItemZod.array()),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey } = req.body[0];
      const db = await getDB(eventKey);
      await db.insertValue('schedule', req.body);
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
      const { eventKey, tournamentKey } = req.params;
      const db = await getDB(eventKey);
      await db.deleteWhere(
        'schedule',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
      );
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.patch(
  '/:eventKey/:tournamentKey/:id',
  validateBodyZ(teamZod),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey, tournamentKey, id } = req.params;
      const db = await getDB(eventKey);
      await db.updateWhere(
        'schedule',
        req.body,
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND id = "${id}"`
      );
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
