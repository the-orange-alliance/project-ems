import { isAppStoragePatch, isAppStoragePost } from '@toa-lib/models';
import { getAll, setAll, setKey } from '@toa-lib/server';
import { NextFunction, Request, Response, Router } from 'express';
import { validateBody } from '../middleware/BodyValidator.js';

const router = Router();

router.get(
  '/:store',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getAll(req.params.store);
      res.send(data);
    } catch (e) {
      return next(e);
    }
  }
);

router.post(
  '/',
  validateBody(isAppStoragePost),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await setAll(req.body.file, req.body.data);
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

router.patch(
  '/',
  validateBody(isAppStoragePatch),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await setKey(req.body.file, req.body.key, req.body.data);
      res.status(200).send({});
    } catch (e) {
      return next(e);
    }
  }
);

export default router;
