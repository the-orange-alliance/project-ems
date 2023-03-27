import { getSeasonKeyFromEventKey, isEvent } from '@toa-lib/models';
import { NextFunction, Response, Request, Router } from 'express';
import { getDB } from '../db/EventDatabase.js';
import { validateBody } from '../middleware/BodyValidator.js';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = await getDB('global');
    const data = await db.selectAll('event');
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
      const db = await getDB('global');
      const data = await db.selectAllWhere('event', `eventKey = "${eventKey}"`);
      res.send(data);
    } catch (e) {
      return next(e);
    }
  }
);

router.post(
  '/',
  validateBody(isEvent),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await getDB('global');
      await db.insertValue('event', [req.body]);
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.patch(
  '/:eventKey',
  validateBody(isEvent),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey } = req.params;
      const db = await getDB('global');
      await db.updateWhere('event', req.body, `eventKey = "${eventKey}"`);
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.get(
  '/setup/:eventKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey } = req.params;
      const db = await getDB(eventKey);
      await db.createEventBase();
      await db.createEventGameSpecifics(getSeasonKeyFromEventKey(eventKey));
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
