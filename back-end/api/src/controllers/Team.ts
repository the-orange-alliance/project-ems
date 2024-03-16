import { NextFunction, Response, Request, Router } from 'express';
import { getDB } from '../db/EventDatabase.js';
import { validateBodyZ } from '../middleware/BodyValidator.js';
import { DataNotFoundError } from '../util/Errors.js';
import { teamZod } from '@toa-lib/models';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = await getDB('global');
    const data = await db.selectAll('team');
    res.send(data);
  } catch (e) {
    return next(e);
  }
});

router.get(
  '/:eventKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey } = req.params;
      const db = await getDB(eventKey);
      const data = await db.selectAllWhere('team', `eventKey = "${eventKey}"`);
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
  '/:eventKey',
  validateBodyZ(teamZod.array()),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey } = req.params;
      const db = await getDB(eventKey);
      await db.insertValue('team', req.body);
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.patch(
  '/:eventKey/:teamKey',
  validateBodyZ(teamZod.array()),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey, teamKey } = req.params;
      const db = await getDB(eventKey);
      await db.updateWhere(
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
      const db = await getDB(eventKey);
      const data = await db.deleteWhere(
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
