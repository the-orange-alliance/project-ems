import { FastifyInstance} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { getDB } from '../db/EventDatabase.js';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { errorableSchema, InternalServerError } from '../util/Errors.js';
import { SuccessSchema } from '../util/GlobalSchema.js';

// Zod schemas for all endpoints
const connectBodySchema = z.object({
  persistantClientId: z.string().nullable().optional(),
  connected: z.number().default(1),
  audienceDisplayChroma: z.string().nullable().optional()
});

const persistantClientParams = z.object({
  persistantClientId: z.string()
});
const updateBodySchema = z.object({
  audienceDisplayChroma: z.string().optional()
});

const disconnectParamsSchema = z.object({
  lastSocketId: z.string()
});

const socketClientSchema = connectBodySchema.extend({
  // Add any additional fields returned by DB if needed
});
const socketClientArraySchema = z.array(socketClientSchema);

// Fastify plugin for socket clients routes
async function socketClientsController(fastify: FastifyInstance) {
  // Get all displays
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      schema: {
        response: errorableSchema<typeof socketClientArraySchema>(socketClientArraySchema),
        tags: ['Sockets']
      }
    },
    async (request, reply) => {
      try {
        const db = await getDB('global');
        const clients = await db.selectAll('socket_clients');
        reply.send(clients);
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // New client
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/connect',
    {
      schema: {
        body: connectBodySchema,
        response: errorableSchema<typeof socketClientSchema>(socketClientSchema),
        tags: ['Sockets']
      }
    },
    async (request, reply) => {
      try {
        const body = request.body as z.infer<typeof connectBodySchema>;
        const db = await getDB('global');
        let result = body;
        if (body.persistantClientId) {
          result.connected = 1;
          if (result.audienceDisplayChroma) {
            result.audienceDisplayChroma = result.audienceDisplayChroma.replaceAll('"', '');
          }
          const client = await db.selectAllWhere(
            'socket_clients',
            `persistantClientId = "${result.persistantClientId}"`
          );
          if (client.length > 0) {
            await db.updateWhere(
              'socket_clients',
              result,
              `persistantClientId = "${result.persistantClientId}"`
            );
          } else {
            await db.insertValue('socket_clients', [result]);
          }
        } else {
          result.persistantClientId = uuidv4();
          await db.insertValue('socket_clients', [result]);
        }
        reply.send(result);
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Client Disconnected
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/update/:persistantClientId',
    {
      schema: {
        params: persistantClientParams,
        body: updateBodySchema,
        response: errorableSchema<typeof SuccessSchema>(SuccessSchema),
        tags: ['Sockets']
      }
    },
    async (request, reply) => {
      const { persistantClientId } = request.params as z.infer<typeof persistantClientParams>;
      try {
        const body = request.body as z.infer<typeof updateBodySchema>;
        const db = await getDB('global');
        await db.updateWhere(
          'socket_clients',
          body,
          `persistantClientId = "${persistantClientId}"`
        );
        reply.send({ success: true });
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Client Deleted (disconnect)
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/disconnect/:lastSocketId',
    {
      schema: {
        params: disconnectParamsSchema,
        response: errorableSchema<typeof SuccessSchema>(SuccessSchema),
        tags: ['Sockets']
      }
    },
    async (request, reply) => {
      const { lastSocketId } = request.params as z.infer<typeof disconnectParamsSchema>;
      try {
        const db = await getDB('global');
        await db.updateWhere(
          'socket_clients',
          { connected: 0 },
          `lastSocketId = "${lastSocketId}"`
        );
        reply.send({ success: true });
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );

  // Client Deleted (remove)
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    '/remove/:persistantClientId',
    {
      schema: {
        params: persistantClientParams,
        response: errorableSchema<typeof SuccessSchema>(SuccessSchema),
        tags: ['Sockets']
      }
    },
    async (request, reply) => {
      const { persistantClientId } = request.params as z.infer<typeof persistantClientParams>;
      try {
        const db = await getDB('global');
        await db.deleteWhere(
          'socket_clients',
          `persistantClientId = "${persistantClientId}"`
        );
        reply.send({ success: true });
      } catch (e) {
        reply.send(InternalServerError(e));
      }
    }
  );
}

export default socketClientsController;
