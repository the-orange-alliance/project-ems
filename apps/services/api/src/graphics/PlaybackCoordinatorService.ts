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
const knownEventKeysByServer = new WeakMap<
  FastifyInstance['server'],
  Set<string>
>();

/**
 * Returns the process-wide PlaybackCoordinator for this Fastify app, creating
 * it on first call. Later tasks (HTTP routes, realtime bridging) call this
 * with the same `app` to reach the one instance created at startup; no
 * playback operations (navigation/take/refresh/etc.) are implemented here.
 */
export function getPlaybackCoordinator(
  app: FastifyInstance,
  options: PlaybackCoordinatorServiceOptions = {}
): PlaybackCoordinator {
  const existing = coordinators.get(app.server);
  if (existing) return existing;

  const repository = options.repository ?? new GraphicsRepository(options);
  const knownEventKeys = new Set<string>();
  const userPublish = options.publish;

  const coordinator = new PlaybackCoordinator({
    storage: repository,
    now: options.now,
    newId: options.newId,
    onPublicationError: options.onPublicationError,
    // Only wrap publish when the caller actually configured one: an absent
    // publish must remain absent so the coordinator skips delivery entirely.
    ...(userPublish
      ? {
          publish: (eventKey: string, state: PlaybackState) => {
            knownEventKeys.add(eventKey);
            return userPublish(eventKey, state);
          }
        }
      : {})
  });

  coordinators.set(app.server, coordinator);
  knownEventKeysByServer.set(app.server, knownEventKeys);
  app.addHook('onClose', async () => {
    coordinators.delete(app.server);
    knownEventKeysByServer.delete(app.server);
    // Best-effort: give any in-flight publication retries a chance to land
    // before the process exits. Durable state was already committed;
    // failure here can never roll anything back.
    await Promise.allSettled(
      [...knownEventKeys].map((eventKey) =>
        coordinator.retryPublication(eventKey)
      )
    );
  });

  return coordinator;
}
