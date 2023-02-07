import { isTeam, isTournamentArray } from '@toa-lib/models';
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
    const data = await selectAll('tournament');
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
        'tournament',
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
  validateBody(isTournamentArray),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await insertValue('tournament', req.body);
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.patch(
  '/:eventKey/:tournamentKey',
  validateBody(isTeam),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey, tournamentKey } = req.params;
      await updateWhere(
        'tournament',
        req.body,
        `eventKey = "${eventKey}" AND tournamentKey = "${tournamentKey}"`
      );
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
