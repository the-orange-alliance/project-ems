import {
  toTournamentJSON,
  Tournament,
  tournamentDatabaseZod
} from '@toa-lib/models';
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
        'tournament',
        `eventKey = "${eventKey}"`
      );
      if (!data) {
        return next(DataNotFoundError);
      }
      res.send(data.map((t) => tournamentDatabaseZod.parse(t)));
    } catch (e) {
      return next(e);
    }
  }
);

router.post(
  '/',
  validateBodyZ(tournamentDatabaseZod),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey } = req.body[0];
      const db = await getDB(eventKey);
      await db.insertValue(
        'tournament',
        req.body.map((t: Tournament) => toTournamentJSON(t))
      );
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.patch(
  '/:eventKey/:tournamentKey',
  validateBodyZ(tournamentDatabaseZod),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey, tournamentKey } = req.params;
      const db = await getDB(eventKey);
      await db.updateWhere(
        'tournament',
        toTournamentJSON(req.body),
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
      );
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
