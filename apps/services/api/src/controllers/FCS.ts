import { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { getDB } from '../db/EventDatabase.js';
import { errorableSchema, InternalServerError } from '../util/Errors.js';
import { EmptySchema } from '../util/GlobalSchema.js';
import { FGC25FCS } from '@toa-lib/models/fcs';

async function fcsController(fastify: FastifyInstance) {
  // Get FCS settings for a specific field
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/settings/:field',
    { schema: { params: z.object({ field: z.string() }), response: errorableSchema(z.unknown()), tags: ['FCS'] } },
    async (request, reply) => {
      try {
        const { field } = request.params;
        const db = await getDB('global');
        const data = await db.selectAllWhere('fcs_settings', `field = "${field}"`);
        if (data.length === 0) {
          // Return default value for the field
          const defaultValue = FGC25FCS.constants;
          reply.send(defaultValue);
        } else {
          reply.send(JSON.parse(data[0].data));
        }
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Upsert FCS settings for a specific field
  fastify.withTypeProvider<ZodTypeProvider>().put(
    '/settings/:field',
    { schema: { params: z.object({ field: z.string() }), body: z.unknown(), response: errorableSchema(EmptySchema), tags: ['FCS'] } },
    async (request, reply) => {
      try {
        const { field } = request.params;
        const db = await getDB('global');
        const data = JSON.stringify(request.body);
        await db.upsert('fcs_settings', { field, data }, ['field']);
        reply.status(200).send({});
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );
}

export default fcsController;
