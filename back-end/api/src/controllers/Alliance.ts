import { isAllianceArray, isAllianceMember } from '@toa-lib/models';
import { NextFunction, Response, Request, Router } from 'express';
import { getDB } from '../db/EventDatabase.js';
import { validateBody } from '../middleware/BodyValidator.js';
import { DataNotFoundError } from '../util/Errors.js';

const router = Router();

router.get(
  '/:eventKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey } = req.params;
      const db = await getDB(eventKey);
      const data = await db.selectAllWhere(
        'alliance',
        `eventKey = "${eventKey}"`
      );
      res.send(data);
    } catch (e) {
      return next(e);
    }
  }
);

router.get(
  '/:eventKey/:rank',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey } = req.params;
      const db = await getDB(eventKey);
      const data = await db.selectAllWhere(
        'alliance',
        `allianceRank = ${req.params.rank}`
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
  '/:eventKey',
  validateBody(isAllianceArray),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey } = req.params;
      const db = await getDB(eventKey);
      await db.insertValue('alliance', req.body);
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.patch(
  '/:eventKey/:allianceKey',
  validateBody(isAllianceMember),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { evnetKey, allianceKey } = req.params;
      const db = await getDB(evnetKey);
      await db.updateWhere(
        'alliance',
        req.body,
        `allianceKey = "${req.params.allianceKey}"`
      );
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
