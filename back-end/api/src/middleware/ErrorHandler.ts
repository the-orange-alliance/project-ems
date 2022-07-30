import { NextFunction, Request, Response } from 'express';
import logger from '../util/Logger';
import { isApiError } from '../types';

const handle = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (isApiError(error)) {
    logger.error(`[${error.code}] ${error.message} (${req.originalUrl})`);
    res.status(error.code).send(JSON.stringify(error));
  } else {
    logger.error(`${JSON.stringify(error)} (${req.originalUrl})`);
    res.status(500).send(JSON.stringify(error));
  }
};

export default handle;
