import { randomUUID } from 'node:crypto';
import {
  createPlaybackStateEnvelope,
  type PlaybackState
} from '@toa-lib/models/base';

const DEFAULT_REALTIME_BASE_URL = 'http://127.0.0.1:8081';
const DEFAULT_TIMEOUT_MS = 2_000;

export interface RealtimePlaybackPublisherOptions {
  baseUrl?: string;
  token: string;
  authorityEpoch?: string;
  timeoutMs?: number;
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
  const fetchImpl = options.fetch ?? globalThis.fetch;

  return {
    authorityEpoch,
    async publish(eventKey, state) {
      if (eventKey !== state.eventKey)
        throw new Error('Published playback state must match the event key.');
      const publication = createPlaybackStateEnvelope(authorityEpoch, state);
      const response = await fetchImpl(
        `${baseUrl}/internal/graphics/playback`,
        {
          method: 'POST',
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${options.token}`,
            'content-type': 'application/json'
          },
          body: JSON.stringify(publication),
          signal: AbortSignal.timeout(timeoutMs)
        }
      );
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(
          `Realtime playback publication failed (${response.status})${
            detail ? `: ${detail}` : ''
          }`
        );
      }
    }
  };
}
