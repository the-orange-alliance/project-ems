import { useCallback, useMemo, useState } from 'react';
import { FcsConnectionEvents, FcsConnectionStatus } from '@toa-lib/models';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { useSocketSubscriptions } from 'src/api/use-socket-subscriptions.js';

const DISCONNECTED: FcsConnectionStatus = { connected: false, fields: [] };

/**
 * Tracks whether field hardware (FCS) is reporting status, along with the
 * state of its devices (e.g. WLEDs). The realtime server pushes
 * `fcs:connection` on join and whenever a field or one of its devices changes.
 *
 * Returns null until the server has sent one, i.e. when connected to an older
 * realtime server that doesn't track fields, so callers can hide the badge
 * rather than show a field as disconnected.
 */
export const useFieldConnection = (): FcsConnectionStatus | null => {
  const { worker, connected } = useSocketWorker();
  const [status, setStatus] = useState<FcsConnectionStatus | null>(null);

  const subscriptions = useMemo(
    () => [
      {
        key: FcsConnectionEvents.Connection,
        callback: (data: FcsConnectionStatus) => setStatus(data ?? DISCONNECTED)
      }
    ],
    []
  );

  const requestStatus = useCallback(() => {
    void worker?.emit(FcsConnectionEvents.GetConnection);
  }, [worker]);

  useSocketSubscriptions(worker, connected, subscriptions, requestStatus);

  // If we lose our own socket we can't know the field's state
  return connected || !status ? status : DISCONNECTED;
};
