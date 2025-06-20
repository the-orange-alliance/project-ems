import { defaultScheduleParams, teamZod } from '@toa-lib/models';
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
        'schedule_params',
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
        'schedule_params',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
      );
      if (!data) {
        return next(DataNotFoundError);
      }
      // Schedule params are stored as an array of objects, so we need to return the first item
      if (data.length === 0) {
        res.send({ ...defaultScheduleParams, eventKey, tournamentKey });
        return;
      } else {
        const sp = data[0];
        res.send({
          ...sp,
          teamKeys: JSON.parse(sp.teamKeys || '[]'),
          days: JSON.parse(sp.days || '[]'),
          options: JSON.parse(sp.options || '{}'),
        });
        return;
      }
    } catch (e) {
      return next(e);
    }
  }
);

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventKey } = req.body[0];
    const db = await getDB(eventKey);
    await db.insertValue('schedule_params', req.body);
    res.status(200).send({});
  } catch (e) {
    return next(e);
  }
});

router.delete(
  '/:eventKey/:tournamentKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey, tournamentKey } = req.params;
      const db = await getDB(eventKey);
      await db.deleteWhere(
        'schedule_params',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
      );
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.patch(
  '/:eventKey/:tournamentKey',
  // TODO: Validate body with Zod schema
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey } = req.params;
      const db = await getDB(eventKey);
      // convert to json
      req.body.days = JSON.stringify(req.body.days);
      req.body.teamKeys = JSON.stringify(req.body.teamKeys);
      req.body.options = JSON.stringify(req.body.options);
      await db.upsert(
        'schedule_params',
        req.body,
        ['eventKey', 'tournamentKey'],
      );
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
