import { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { getDB } from '../db/EventDatabase.js';
import { errorableSchema, InternalServerError } from '../util/Errors.js';
import { EventKeyParams, EmptySchema } from '../util/GlobalSchema.js';

async function adminController(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    '/purge/:eventKey',
    {
      schema: {
        params: EventKeyParams,
        response: errorableSchema(EmptySchema),
        tags: ['Admin']
      }
    },
    async (request, reply) => {
      try {
        const { eventKey } = request.params as z.infer<typeof EventKeyParams>;
        const db = await getDB(eventKey);
        await db.purgeAll();
        reply.status(200).send({});
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );
}

export default adminController;
