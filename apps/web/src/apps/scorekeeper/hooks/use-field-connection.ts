import { useCallback, useMemo, useState } from 'react';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { useSocketSubscriptions } from 'src/api/use-socket-subscriptions.js';

export interface FieldConnectionStatus {
  connected: boolean;
  fields: number[];
}

const DISCONNECTED: FieldConnectionStatus = { connected: false, fields: [] };

/**
 * Tracks whether field hardware (FCS) has identified itself in the fcs room.
 * The realtime server pushes `fcs:connection` on join and whenever a field
 * connects or disconnects.
 */
export const useFieldConnection = (): FieldConnectionStatus => {
  const { worker, connected } = useSocketWorker();
  const [status, setStatus] = useState<FieldConnectionStatus>(DISCONNECTED);

  const subscriptions = useMemo(
    () => [
      {
        key: 'fcs:connection',
        callback: (data: FieldConnectionStatus) =>
          setStatus(data ?? DISCONNECTED)
      }
    ],
    []
  );

  const requestStatus = useCallback(() => {
    void worker?.emit('fcs:getConnection');
  }, [worker]);

  useSocketSubscriptions(worker, connected, subscriptions, requestStatus);

  // If we lose our own socket we can't know the field's state
  return connected ? status : DISCONNECTED;
};
