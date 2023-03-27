import { NextFunction, Request, Response, Router } from 'express';
import { getDB } from '../db/EventDatabase.js';

const router = Router();

router.delete(
  '/purge/:eventKey',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventKey } = req.params;
      const db = await getDB(eventKey);
      await db.purgeAll();
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
