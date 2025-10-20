import { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { getDB } from '../db/EventDatabase.js';
import { errorableSchema, InternalServerError } from '../util/Errors.js';
import { toDbWebhook, WebhookDbSchema, WebhookSchema } from '@toa-lib/models';
import { SendWebhookSchema } from '@toa-lib/models/base';
import { SuccessSchema } from '../util/GlobalSchema.js';
import { EmitWebhooks } from '../util/Webhooks.js';

async function webhooksController(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().post(
    '/send',
    {
      schema: {
        body: SendWebhookSchema,
        response: errorableSchema(SuccessSchema),
        tags: ['Webhooks']
      }
    },
    async (request, reply) => {
      try {
        const { event, payload } = request.body;
        await EmitWebhooks(event, payload);
        reply.status(200).send({ success: true });
      } catch (e) {
        console.error(e);
        reply.code(200).send({ success: false });
      }
    }
  );

  // Get Webhooks
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      schema: {
        response: errorableSchema(z.array(WebhookDbSchema)),
        tags: ['Webhooks']
      }
    },
    async (request, reply) => {
      try {
        const db = await getDB('global');
        const webhooks = await db.selectAll('webhooks');
        console.log('Fetched webhooks:', webhooks);
        reply.status(200).send(webhooks);
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Upsert Webhook
  fastify.withTypeProvider<ZodTypeProvider>().put(
    '/',
    {
      schema: {
        body: WebhookSchema,
        response: errorableSchema(z.unknown()),
        tags: ['Webhooks']
      }
    },
    async (request, reply) => {
      try {
        const db = await getDB('global');
        const webhook = toDbWebhook(request.body);
        const result = await db.upsert('webhooks', webhook, ['id']);
        reply.status(200).send(result);
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );

  // Delete Webhook
  fastify.withTypeProvider<ZodTypeProvider>().delete(
    '/:id',
    {
      schema: {
        params: z.object({
          id: z.string()
        }),
        response: errorableSchema(z.unknown()),
        tags: ['Webhooks']
      }
    },
    async (request, reply) => {
      try {
        const db = await getDB('global');
        const { id } = request.params as { id: string };
        await db.deleteWhere('webhooks', `id = ${id}`);
        reply.status(200).send({});
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );
}

export default webhooksController;
