import { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { createRequire } from 'module';
import { errorableSchema, InternalServerError } from '../util/Errors.js';

// Read the api package's own version at load time. Using createRequire instead
// of a static JSON import avoids needing resolveJsonModule/import-attribute
// changes to tsconfig, and resolves correctly from the compiled build/ output.
const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

const heartbeatSchema = z.object({
  online: z.boolean(),
  serverTimeUtc: z.string(),
  version: z.string()
});

// Fastify plugin for the heartbeat route. Intentionally unauthenticated and
// DB-free so audience displays and infra monitoring can poll it cheaply to
// detect a new deploy (version changes) or check liveness.
async function heartbeatController(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      schema: {
        response: errorableSchema<typeof heartbeatSchema>(heartbeatSchema),
        tags: ['Heartbeat']
      }
    },
    async (request, reply) => {
      try {
        reply.send({
          online: true,
          serverTimeUtc: new Date().toISOString(),
          version
        });
      } catch (e) {
        reply.code(500).send(InternalServerError(e));
      }
    }
  );
}

export default heartbeatController;
