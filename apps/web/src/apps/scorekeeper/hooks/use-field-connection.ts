import { useCallback, useMemo, useState } from 'react';
import { FcsConnectionEvents, FcsConnectionStatus } from '@toa-lib/models';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { useSocketSubscriptions } from 'src/api/use-socket-subscriptions.js';

const DISCONNECTED: FcsConnectionStatus = { connected: false, fields: [] };

/**
 * Tracks whether field hardware (FCS) has identified itself in the fcs room,
 * along with the state of its devices (e.g. WLEDs). The realtime server pushes
 * `fcs:connection` on join and whenever a field or one of its devices changes.
 */
export const useFieldConnection = (): FcsConnectionStatus => {
  const { worker, connected } = useSocketWorker();
  const [status, setStatus] = useState<FcsConnectionStatus>(DISCONNECTED);

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
  return connected ? status : DISCONNECTED;
};
