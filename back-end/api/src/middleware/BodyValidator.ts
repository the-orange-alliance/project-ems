import { TypeGuard } from '@toa-lib/models';
import { NextFunction, Request, Response } from 'express';
import { BodyNotValidError, EmptyBodyError } from '../util/Errors.js';
import { z } from 'zod';

export const validateBody =
  <T>(t: TypeGuard<T>) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.body) return next(EmptyBodyError);
    if (!t(req.body)) return next(BodyNotValidError);
    return next();
  };

export const validateBodyZ =
  <T extends z.ZodRawShape>(t: z.ZodObject<T>) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.body) return next(EmptyBodyError);
    try {
      t.parse(req.body);
      return next();
    } catch (e) {
      return next(BodyNotValidError);
    }
  };
