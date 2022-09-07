import { NextFunction, Response, Request, Router } from 'express';
import { createEventBase, selectAll } from '../db/Database';
import { DataNotFoundError } from '../util/Errors';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [data] = await selectAll('event');
    if (!data) {
      return next(DataNotFoundError);
    }
    res.send(data);
  } catch (e) {
    return next(e);
  }
});

router.get(
  '/setup',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await createEventBase();
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
