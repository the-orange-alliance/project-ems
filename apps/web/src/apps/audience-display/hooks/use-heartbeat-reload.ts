import { useEffect, useRef } from 'react';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { useHeartbeat } from 'src/api/use-heartbeat-data.js';

const TEN_MINUTES_MS = 10 * 60 * 1000;

/**
 * Polls `/heartbeat` every 10 minutes and reloads the page if the reported
 * `version` changes, so long-lived, unattended audience display tabs pick up
 * a new deploy on their own.
 *
 * Also forces an immediate out-of-band check on the shared socket worker's
 * disconnected -> connected transition specifically (not on mount, not on
 * every toggle) - a reconnect after a drop is the earliest signal that the
 * backend may have restarted as part of a deploy, and there's no reason to
 * wait out the rest of the 10-minute poll once that's happened.
 *
 * Scoped to the audience-display app rather than the app-wide
 * `ConnectionManager` (mounted in `App.tsx`, and therefore present in every
 * open tab) - see `use-match-lifecycle-webhooks.ts` for the same reasoning.
 */
export const useHeartbeatReload = () => {
  const { connected } = useSocketWorker();
  const { data, mutate } = useHeartbeat(TEN_MINUTES_MS);
  const knownVersion = useRef<string | null>(null);
  const wasConnected = useRef(connected);

  useEffect(() => {
    if (!data) return;
    if (knownVersion.current === null) {
      knownVersion.current = data.version;
      return;
    }
    if (data.version !== knownVersion.current) {
      window.location.reload();
    }
  }, [data]);

  useEffect(() => {
    if (connected && !wasConnected.current) {
      void mutate();
    }
    wasConnected.current = connected;
  }, [connected, mutate]);
};
