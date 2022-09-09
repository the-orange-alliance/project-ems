import { isTeam, isTeamArray } from '@toa-lib/models';
import { NextFunction, Response, Request, Router } from 'express';
import { insertValue, selectAll, updateWhere } from '../db/Database';
import { validateBody } from '../middleware/BodyValidator';
import { DataNotFoundError } from '../util/Errors';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [data] = await selectAll('team');
    if (!data) {
      return next(DataNotFoundError);
    }
    res.send(data);
  } catch (e) {
    return next(e);
  }
});

router.post(
  '/',
  validateBody(isTeamArray),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await insertValue('team', req.body);
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.patch(
  '/:eventKey',
  validateBody(isTeam),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await updateWhere('team', req.body, `teamKey = "${req.params.eventKey}"`);
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
