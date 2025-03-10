import { allianceMemberZod } from '@toa-lib/models';
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
  '/:eventKey/:tournamentKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey, tournamentKey } = req.params;
      const db = await getDB(eventKey);
      const data = await db.selectAllWhere(
        'alliance',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
      );
      res.send(data);
    } catch (e) {
      return next(e);
    }
  }
);

router.get(
  '/:eventKey/:tournamentKey/:rank',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey, tournamentKey, rank } = req.params;
      const db = await getDB(eventKey);
      const data = await db.selectAllWhere(
        'alliance',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND allianceRank = ${rank}`
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
  validateBodyZ(allianceMemberZod.array()),
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
  '/:eventKey/:tournamentKey/:teamKey',
  validateBodyZ(allianceMemberZod),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey, tournamentKey, teamKey } = req.params;
      const db = await getDB(eventKey);
      await db.updateWhere(
        'alliance',
        req.body,
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}" AND teamKey = "${teamKey}"`
      );
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
      const { eventKey, tournamentKey, teamKey } = req.params;
      const db = await getDB(eventKey);
      await db.deleteWhere(
        'alliance',
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
      );
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
