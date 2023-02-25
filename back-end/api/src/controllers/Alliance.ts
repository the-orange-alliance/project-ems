import { isAllianceArray, isAllianceMember } from '@toa-lib/models';
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

router.get(
  '/:eventKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eventKey = req.params.eventKey;
      const data = await selectAllWhere('alliance', `eventKey = "${eventKey}"`);
      res.send(data);
    } catch (e) {
      return next(e);
    }
  }
);

router.get(
  '/:rank',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await selectAllWhere(
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
  '/',
  validateBody(isAllianceArray),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await insertValue('alliance', req.body);
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.patch(
  '/:allianceKey',
  validateBody(isAllianceMember),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await updateWhere(
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
