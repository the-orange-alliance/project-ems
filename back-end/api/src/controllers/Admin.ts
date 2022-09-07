import { NextFunction, Request, Response, Router } from 'express';
import { purgeAll } from '../db/Database';

const router = Router();

router.delete(
  '/purge',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await purgeAll();
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
