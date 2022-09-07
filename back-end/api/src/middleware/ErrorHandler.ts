import { NextFunction, Request, Response } from 'express';
import logger from '../util/Logger';
import { ApiDatabaseError, ApiError, isApiError } from '@toa-lib/models';
import { RouteNotFound } from '../util/Errors';

const handleErrors = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof ApiDatabaseError) {
    logger.error(`[500] ${error.message} (${req.originalUrl})`);
    res.status(500).send(toApiError(error));
  } else if (isApiError(error)) {
    logger.error(`[${error.code}] ${error.message} (${req.originalUrl})`);
    res.status(error.code).send(JSON.stringify(error));
  } else {
    logger.error(`${JSON.stringify(error)} (${req.originalUrl})`);
    res.status(500).send(JSON.stringify(error));
  }
};

const handleCatchAll = (req: Request, res: Response, next: NextFunction) => {
  logger.warn(`Route not found (${req.originalUrl})`);
  res.status(404).send(JSON.stringify(RouteNotFound));
};

function toApiError(err: ApiDatabaseError): ApiError {
  return { code: 500, message: err.message };
}

export { handleErrors, handleCatchAll };
