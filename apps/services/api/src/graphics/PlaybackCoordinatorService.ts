import type { FastifyInstance } from 'fastify';
import type { PlaybackState } from '@toa-lib/models/base';
import {
  GraphicsRepository,
  type GraphicsRepositoryOptions
} from './GraphicsRepository.js';
import {
  PlaybackCoordinator,
  type PlaybackCoordinatorOptions
} from './PlaybackCoordinator.js';

export interface PlaybackCoordinatorServiceOptions extends GraphicsRepositoryOptions {
  repository?: GraphicsRepository;
  publish?: (eventKey: string, state: PlaybackState) => Promise<void> | void;
  onPublicationError?: PlaybackCoordinatorOptions['onPublicationError'];
  publicationRetryBaseMs?: PlaybackCoordinatorOptions['publicationRetryBaseMs'];
  publicationRetryMaxMs?: PlaybackCoordinatorOptions['publicationRetryMaxMs'];
  shutdownTimeoutMs?: number;
  now?: PlaybackCoordinatorOptions['now'];
  newId?: PlaybackCoordinatorOptions['newId'];
}

/**
 * Fastify plugins are encapsulated, but their HTTP server is shared - mirrors
 * StatsQueryService's app-scoped singleton so route registration (owned by a
 * later task) and Server.ts startup resolve to the same coordinator.
 */
const coordinators = new WeakMap<
  FastifyInstance['server'],
  PlaybackCoordinator
>();

/**
 * Returns the process-wide PlaybackCoordinator for this Fastify app, creating
 * it on first call. Server startup supplies the realtime publisher before any
 * controller plugin can resolve this singleton; encapsulated plugins then
 * reach the same instance through the shared raw HTTP server.
 */
export function getPlaybackCoordinator(
  app: FastifyInstance,
  options: PlaybackCoordinatorServiceOptions = {}
): PlaybackCoordinator {
  const existing = coordinators.get(app.server);
  if (existing) return existing;

  const repository = options.repository ?? new GraphicsRepository(options);

  const coordinator = new PlaybackCoordinator({
    storage: repository,
    now: options.now,
    newId: options.newId,
    onPublicationError: options.onPublicationError,
    publicationRetryBaseMs: options.publicationRetryBaseMs,
    publicationRetryMaxMs: options.publicationRetryMaxMs,
    ...(options.publish ? { publish: options.publish } : {})
  });

  coordinators.set(app.server, coordinator);
  app.addHook('onClose', async () => {
    coordinators.delete(app.server);
    await coordinator.shutdown(options.shutdownTimeoutMs);
  });

  return coordinator;
}
