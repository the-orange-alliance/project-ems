import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { getAll, setAll, setKey } from '@toa-lib/server';
import { errorableSchema } from '../util/Errors.js';
import SchemaRef from '../util/GlobalSchema.js';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

// Params schema for GET /:store
const StorageParamsSchema = z.object({ store: z.string() });

// POST body schema
const StoragePostSchema = z.object({
  file: z.string(),
  data: z.record(z.unknown())
});

// PATCH body schema
const StoragePatchSchema = z.object({
  file: z.string(),
  key: z.string(),
  data: z.unknown()
});

// Response schema for GET /:store (unknown object)
const StorageResponseSchema = z.record(z.unknown());

type StorageParams = z.infer<typeof StorageParamsSchema>;
type StoragePost = z.infer<typeof StoragePostSchema>;
type StoragePatch = z.infer<typeof StoragePatchSchema>;

export default async function StorageController(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/:store',
    schema: {
      tags: ['Storage'],
      params: StorageParamsSchema,
      response: errorableSchema(StorageResponseSchema)
    },
    async handler(request) {
      const { store } = request.params as StorageParams;
      const data = await getAll(store);
      return data;
    }
  });

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/',
    schema: {
      tags: ['Storage'],
      body: StoragePostSchema,
      response: errorableSchema(SchemaRef.EmptySchema)
    },
    async handler(request) {
      const body = request.body as StoragePost;
      await setAll(body.file, body.data);
      return {};
    }
  });

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'PATCH',
    url: '/',
    schema: {
      tags: ['Storage'],
      body: StoragePatchSchema,
      response: errorableSchema(SchemaRef.EmptySchema)
    },
    async handler(request) {
      const body = request.body as StoragePatch;
      await setKey(body.file, body.key, body.data);
      return {};
    }
  });
}
