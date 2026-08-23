import logger from '../util/Logger.js';
import { ApiDatabaseError, ApiError, isApiError } from '@toa-lib/models';
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

const handleErrors = (
  error: unknown,
  req: FastifyRequest,
  reply: FastifyReply
) => {
  if (hasZodFastifySchemaValidationErrors(error)) {
    // A schema violation is the caller's mistake, not ours. Without this branch
    // it falls through to the catch-all below and every malformed request — a
    // bad `?since=` cursor, a mistyped body — comes back as a 500, sending API
    // consumers off hunting for a server-side bug that isn't there.
    logger.warn(`[400] ${error.message} (${req.method} - ${req.originalUrl})`);
    reply.status(400).send({ code: 400, message: error.message });
  } else if (error instanceof ApiDatabaseError) {
    logger.error(`[500] ${error.message} (${req.method} - ${req.originalUrl})`);
    reply.status(500).send(toApiError(error));
  } else if (isApiError(error) && error.code <= 500) {
    logger.error(
      `[${error.code}] ${error.message} (${req.method} - ${req.originalUrl})`
    );
    reply.status(error.code).send({ code: error.code, message: error.message });
  } else {
    logger.error(
      `${error} (${req.method} - ${req.originalUrl})\n${error instanceof Error ? error.stack : ''}`
    );
    reply.status(500).send({ code: 500, message: `Internal Server Error: ${error}` });
  }
};

const handleNotFound = (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  logger.warn(
    `[404] Not Found (${req.method} - ${req.originalUrl})`
  );
  reply.status(404).send({ code: 404, message: 'Not Found' });
};

function toApiError(err: ApiDatabaseError): ApiError {
  return { code: 500, message: err.message };
}

export { handleErrors, handleNotFound };
