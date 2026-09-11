import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyFormbody from '@fastify/formbody';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import passport from 'passport';
import {
  jwtStrategy,
  localStrategy,
  requireAuth,
  environment as env,
  getIPv4
} from '@toa-lib/server';
import adminController from './controllers/Admin.js';
import authController from './controllers/Authentication.js';
import eventController from './controllers/Event.js';
import teamController from './controllers/Team.js';
import storageController from './controllers/Storage.js';
import scheduleItemsController from './controllers/ScheduleItem.js';
import scheduleParamsController from './controllers/ScheduleParams.js';
import matchController from './controllers/Match.js';
import rankingController from './controllers/Ranking.js';
import allianceController from './controllers/Alliance.js';
import tournamentController from './controllers/Tournament.js';
import frcFmsController from './controllers/FrcFms.js';
import statsController from './controllers/Stats.js';
import graphicsController from './controllers/Graphics.js';
import graphicsPlaybackController from './controllers/GraphicsPlayback.js';
import heartbeatController from './controllers/Heartbeat.js';
import resultsController from './controllers/Results.js';
import socketClientsController from './controllers/SocketClients.js';
import fcsController from './controllers/FCS.js';
import logger from './util/Logger.js';
import { initGlobal } from './db/EventDatabase.js';
import {
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler
} from 'fastify-type-provider-zod';
import './util/GlobalSchema.js';
import { handleErrors, handleNotFound } from './middleware/ErrorHandler.js';
import { join } from 'path';
import webhooksController from './controllers/Webhooks.js';
import seasonSpecificController from './controllers/SeasonSpecific.js';
import { throttledUploadDatabase, initS3Client } from './util/S3Backup.js';
import { getPlaybackCoordinator } from './graphics/PlaybackCoordinatorService.js';

// Setup our environment
const workingDir = process.env.WORKDIR ?? '../';
const path = join(workingDir, '/api/.env');
env.loadAndSetDefaults(process.env, path);

// App setup - if any of these fail the server should exit, but a cold start can
// race a filesystem that isn't settled yet (WAL lock from a prior process, a
// slow network appdata mount), so give transient failures a few chances before
// giving up. Every step in initGlobal() is idempotent, so a retry is safe.
async function initGlobalWithRetry(attempts = 3, delayMs = 500): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await initGlobal();
      return;
    } catch (e) {
      if (attempt >= attempts) throw e;
      logger.warn(
        `initGlobal failed (attempt ${attempt}/${attempts}), retrying in ${delayMs}ms: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= 2;
    }
  }
}

try {
  await initGlobalWithRetry();
} catch (e) {
  logger.error(e);
  process.exit(1);
}

// Try to setup AWS S3 client if credentials are present
try {
  initS3Client();
} catch (e) {
  logger.warn('S3 Backup client not initialized:', e);
}

// Create Fastify instance
const fastify = Fastify({
  logger:
    env.get().nodeEnv === 'production' ? { level: 'warn' } : { level: 'info' }
});

// Register Error handler for all routes
fastify.setErrorHandler(handleErrors);
fastify.setNotFoundHandler(handleNotFound);

// Register plugins
await fastify.register(fastifyCors, {
  // Set to your frontend's URL if you need credentials, or use '*' if not
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});
await fastify.register(fastifyFormbody);

// Register Zod as the type provider for Fastify
fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

// Setup passport config
passport.use(jwtStrategy(env.get().jwtSecret));
passport.use(localStrategy());

// Register Swagger for API documentation
await fastify.register(fastifySwagger, {
  openapi: {
    info: {
      title: `EMS ${env.get().serviceName}`,
      description: `API documentation for the ${env.get().serviceName} service.`,
      version: '1.0.0'
    },
    tags: [
      { name: 'Events', description: 'Event related endpoints' },
      { name: 'Teams', description: 'Team related endpoints' },
      { name: 'Matches', description: 'Match related endpoints' },
      { name: 'Rankings', description: 'Ranking related endpoints' },
      { name: 'Alliances', description: 'Alliance related endpoints' },
      { name: 'Tournaments', description: 'Tournament related endpoints' },
      { name: 'FrcFms', description: 'FRC FMS related endpoints' },
      { name: 'Stats', description: 'Production statistics and worker queue' },
      {
        name: 'Graphics',
        description: 'Producer-authored graphics timeline endpoints'
      },
      { name: 'Heartbeat', description: 'Heartbeat/health-check endpoint' },
      { name: 'Results', description: 'Results related endpoints' },
      {
        name: 'Schedule Items',
        description: 'Schedule item related endpoints'
      },
      {
        name: 'Schedule Parameters',
        description: 'Schedule parameter related endpoints'
      },
      { name: 'Storage', description: 'Storage related endpoints' },
      {
        name: 'Auth',
        description: 'Authentication and authorization endpoints'
      },
      { name: 'Admin', description: 'Admin related endpoints' },
      { name: 'Sockets', description: 'Socket client related endpoints' },
      { name: 'FCS', description: 'FCS settings related endpoints' },
      { name: 'Webhooks', description: 'Webhook related endpoints' },
      { name: 'Season Specific', description: 'Season specific endpoints' }
    ]
  },
  transform: jsonSchemaTransform,
  transformObject: jsonSchemaTransformObject
});

// Register Swagger UI
await fastify.register(fastifySwaggerUi, {
  routePrefix: '/docs'
});

// Define root/testing paths
fastify.get('/', { preHandler: requireAuth }, async (request, reply) => {
  reply.send(request.headers);
});

await fastify.register(adminController, { prefix: '/admin' });
await fastify.register(allianceController, { prefix: '/alliance' });
await fastify.register(authController, { prefix: '/auth' });
await fastify.register(eventController, { prefix: '/event' });
await fastify.register(fcsController, { prefix: '/fcs' });
await fastify.register(frcFmsController, { prefix: '/frc/fms' });
await fastify.register(statsController, { prefix: '/stats' });
await fastify.register(graphicsController, { prefix: '/graphics' });
await fastify.register(graphicsPlaybackController, { prefix: '/graphics' });
await fastify.register(heartbeatController, { prefix: '/heartbeat' });
await fastify.register(matchController, { prefix: '/match' });
await fastify.register(rankingController, { prefix: '/ranking' });
await fastify.register(resultsController, { prefix: '/results' });
await fastify.register(scheduleItemsController, { prefix: '/schedule-items' });
await fastify.register(scheduleParamsController, {
  prefix: '/schedule-params'
});
await fastify.register(socketClientsController, { prefix: '/socketClients' });
await fastify.register(storageController, { prefix: '/storage' });
await fastify.register(teamController, { prefix: '/teams' });
await fastify.register(tournamentController, { prefix: '/tournament' });
await fastify.register(webhooksController, { prefix: '/webhooks' });
await fastify.register(seasonSpecificController, { prefix: '/seasonSpecific' });

// The HTTP live-command surface (graphicsPlaybackController, registered above under
// '/graphics') already reaches the process-wide graphics playback coordinator via
// getPlaybackCoordinator(fastify), which creates it - and registers its graceful-shutdown
// drain hook (see PlaybackCoordinatorService.ts's onClose) - on that FIRST call. This call
// is kept as a defensive no-op (getPlaybackCoordinator returns the same cached instance
// once created) so the coordinator and its shutdown hook still exist even if controller
// registration order above ever changes. Realtime publish bridging remains a separate,
// sibling-owned task and still reaches this same instance the same way.
getPlaybackCoordinator(fastify);

// 🧩 Global hook: triggers after any mutating request
fastify.addHook('onResponse', (request, reply, done) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const { eventKey } = (request.params as { eventKey?: string }) ?? {};

    if (eventKey && !request.routeOptions.url?.startsWith('/stats/')) {
      throttledUploadDatabase(eventKey);
    }
  }
  done();
});

// Passport serialization (optional, for sessions)
passport.serializeUser((user, cb) => {
  console.log('serialize user', user);
  cb(null, (user as any).id);
});

passport.deserializeUser((id, cb) => {
  console.log('deserialize user', id);
  cb(null, { id: 0, user: 'admin' });
});

// Network variables
const host = getIPv4();
const port = parseInt(env.get().servicePort);

// Start the server
fastify.listen(
  {
    host,
    port: isNaN(port) ? undefined : port
  },
  (err, address) => {
    if (err) {
      logger.error(err);
      process.exit(1);
    }
    logger.info(
      `[${env.get().nodeEnv.charAt(0).toUpperCase()}][${env
        .get()
        .serviceName.toUpperCase()}] Server started on ${host}:${port}`
    );
  }
);

// Graceful shutdown: triggers each registered service's onClose hook
// (including the playback coordinator's) instead of dropping the process.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void fastify.close();
  });
}
