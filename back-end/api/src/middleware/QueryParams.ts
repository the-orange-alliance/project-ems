import { NextFunction, Request, Response } from 'express';
import { isString } from '@toa-lib/models';
import { InvalidQueryError } from '../util/Errors';

export const requireParams =
  (params: string[]) => (req: Request, res: Response, next: NextFunction) => {
    for (const param of params) {
      if (!req.query[param] || !isString(req.query[param])) {
        next(InvalidQueryError);
      }
    }
    next();
  };
