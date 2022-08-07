import { TypeGuard } from '@toa-lib/models';
import { NextFunction, Request, Response } from 'express';
import { BodyNotValidError, EmptyBodyError } from '../util/Errors';

export const validateBody =
  <T>(t: TypeGuard<T>) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.body) return next(EmptyBodyError);
    if (!t(req.body)) return next(BodyNotValidError);
    return next();
  };
