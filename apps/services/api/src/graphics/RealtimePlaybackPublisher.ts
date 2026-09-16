import { randomUUID } from 'node:crypto';
import {
  createPlaybackStateEnvelope,
  type PlaybackState
} from '@toa-lib/models/base';

const DEFAULT_REALTIME_BASE_URL = 'http://127.0.0.1:8081';
const DEFAULT_TIMEOUT_MS = 2_000;

/**
 * Must stay equal to realtime's `DEFAULT_PLAYBACK_PUBLICATION_LIMIT_BYTES`,
 * and both services must read the same `GRAPHICS_PUBLICATION_MAX_BYTES`. It is
 * restated here rather than imported because `realtime` is a test-only
 * dependency of this package; `playback-publication-ingest.test.ts` asserts the
 * two defaults have not drifted apart.
 */
export const DEFAULT_PUBLICATION_BODY_BYTES = 4 * 1024 * 1024;
export const PUBLICATION_BODY_BYTES_ENV = 'GRAPHICS_PUBLICATION_MAX_BYTES';

export function resolvePublicationBodyBytes(
  env: NodeJS.ProcessEnv = process.env
): number {
  const raw = env[PUBLICATION_BODY_BYTES_ENV];
  if (raw === undefined || raw.trim() === '')
    return DEFAULT_PUBLICATION_BODY_BYTES;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0)
    throw new Error(
      `${PUBLICATION_BODY_BYTES_ENV} must be a positive integer byte count; received "${raw}".`
    );
  return parsed;
}

/**
 * A publication that cannot physically fit through the relay ingress.
 *
 * `retryable = false` is load-bearing: `PlaybackCoordinator` parks a
 * non-retryable delivery failure immediately instead of backing off against a
 * body that will be exactly as oversized on every future attempt.
 */
export class PlaybackPublicationTooLargeError extends Error {
  readonly retryable = false;
  constructor(
    message: string,
    readonly eventKey: string,
    readonly revision: number,
    readonly bytes: number,
    readonly limitBytes: number
  ) {
    super(message);
    this.name = 'PlaybackPublicationTooLargeError';
  }
}

export interface RealtimePlaybackPublisherOptions {
  baseUrl?: string;
  token: string;
  authorityEpoch?: string;
  timeoutMs?: number;
  /** Ingress limit the relay is configured with; defaults to the shared env var. */
  maxBodyBytes?: number;
  fetch?: typeof globalThis.fetch;
}

export interface RealtimePlaybackPublisher {
  authorityEpoch: string;
  publish(eventKey: string, state: PlaybackState): Promise<void>;
}

/** Creates the API process's one authenticated, bounded realtime publisher. */
export function createRealtimePlaybackPublisher(
  options: RealtimePlaybackPublisherOptions
): RealtimePlaybackPublisher {
  if (!options.token)
    throw new Error('GRAPHICS_PUBLICATION_TOKEN must not be empty.');

  const authorityEpoch = options.authorityEpoch ?? randomUUID();
  const baseUrl = (options.baseUrl ?? DEFAULT_REALTIME_BASE_URL).replace(
    /\/$/,
    ''
  );
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBodyBytes = options.maxBodyBytes ?? resolvePublicationBodyBytes();
  const fetchImpl = options.fetch ?? globalThis.fetch;

  return {
    authorityEpoch,
    async publish(eventKey, state) {
      if (eventKey !== state.eventKey)
        throw new Error('Published playback state must match the event key.');
      const publication = createPlaybackStateEnvelope(authorityEpoch, state);
      const body = JSON.stringify(publication);
      const bytes = Buffer.byteLength(body);
      // Pre-flight, because the relay's parser rejects an oversized body
      // before any route runs: without this the operator's only evidence was
      // an HTML 413 with no event, no revision and no limit in it.
      if (bytes > maxBodyBytes)
        throw new PlaybackPublicationTooLargeError(
          `Playback publication for event "${eventKey}" revision ${state.revision} is ${bytes} bytes, ` +
            `which exceeds the configured realtime ingress limit of ${maxBodyBytes} bytes. Nothing was sent ` +
            `and no display was updated. Raise ${PUBLICATION_BODY_BYTES_ENV} on BOTH the API and realtime ` +
            `services and restart them, or load a smaller show package.`,
          eventKey,
          state.revision,
          bytes,
          maxBodyBytes
        );
      const response = await fetchImpl(
        `${baseUrl}/internal/graphics/playback`,
        {
          method: 'POST',
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${options.token}`,
            'content-type': 'application/json'
          },
          body,
          signal: AbortSignal.timeout(timeoutMs)
        }
      );
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        // A 413 that reaches here means the two services disagree about the
        // limit. Name it as that, rather than relaying the parser's HTML.
        if (response.status === 413)
          throw new PlaybackPublicationTooLargeError(
            `Realtime refused playback publication for event "${eventKey}" revision ${state.revision}: ` +
              `${bytes} bytes exceeded ITS ingress limit while this API allows ${maxBodyBytes} bytes. ` +
              `The two services disagree - set ${PUBLICATION_BODY_BYTES_ENV} to the same value on both ` +
              `and restart them. No display was updated.`,
            eventKey,
            state.revision,
            bytes,
            maxBodyBytes
          );
        throw new Error(
          `Realtime playback publication failed for event "${eventKey}" revision ${state.revision} ` +
            `(HTTP ${response.status}, ${bytes} bytes)${detail ? `: ${detail}` : ''}`
        );
      }
    }
  };
}
