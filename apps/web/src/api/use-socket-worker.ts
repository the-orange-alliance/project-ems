import { useEffect, useRef, useState } from 'react';
import * as Comlink from 'comlink';
import type { SocketService } from '@workers/shared-socket-worker.js';
import SharedSocketWorker from '@workers/shared-socket-worker?sharedworker';
import { SocketOptions } from '@toa-lib/client';
import {
  FieldControlUpdatePacket,
  MatchKey,
  MatchSocketEvent
} from '@toa-lib/models/base';

export function useSocketWorker() {
  const workerRef = useRef<SharedWorker | null>(null);
  const remoteRef = useRef<Comlink.Remote<SocketService> | null>(null);
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const registeredRef = useRef(false);
  const socket = remoteRef.current;

  useEffect(() => {
    if (!workerRef.current) {
      const worker = new SharedSocketWorker({
        name: '[EMS] Shared Socket Worker'
      });
      worker.port.start();
      worker.onerror = (err) => {
        console.error('SharedWorker error:', err);
      };
      setInitialized(false);
      workerRef.current = worker;
      const remote = Comlink.wrap<SocketService>(worker.port);
      remoteRef.current = remote;

      const proxyConnected = Comlink.proxy((v: boolean) => setConnected(v));
      const proxyReady = Comlink.proxy((v: boolean) => setReady(v));

      const init = async () => {
        // Register this client immediately to cancel any pending shutdowns
        // in the worker (important for React 18 StrictMode double-mount).
        void remoteRef.current?.registerClient().then(() => {
          registeredRef.current = true;
          console.debug('[useSocketWorker] registered client');
        });
        await remoteRef.current?.subscribeConnected(proxyConnected);
        await remoteRef.current?.subscribeReady(proxyReady);
        await remoteRef.current?.initialize('', {
          host: SocketOptions.host,
          port: SocketOptions.port
        });
        const [c, r] = await Promise.all([
          remoteRef.current?.getConnected(),
          remoteRef.current?.getReady()
        ]);
        setConnected(c ?? false);
        setReady(r ?? false);
        setInitialized(true);
      };

      void init();

      return () => {
        try {
          void remoteRef.current?.unsubscribeConnected(proxyConnected);
          void remoteRef.current?.unsubscribeReady(proxyReady);
        } catch {
          // ignore race conditions during tab teardown
        }
        if (registeredRef.current) {
          console.debug('[useSocketWorker] unregistering client');
          remoteRef.current?.unregisterClient();
          registeredRef.current = false;
        }
      };
    }
  }, []);

  const events = {
    prestart: (key: MatchKey) => socket?.emit(MatchSocketEvent.PRESTART, key),
    start: () => socket?.emit(MatchSocketEvent.START),
    abort: () => socket?.emit(MatchSocketEvent.ABORT),
    update: (match: any) => socket?.emit(MatchSocketEvent.UPDATE, match),
    commit: (key: any) => socket?.emit(MatchSocketEvent.COMMIT, key),
    display: (displaySettings?: any) =>
      socket?.emit(MatchSocketEvent.DISPLAY, displaySettings),
    postresults: () => socket?.emit(MatchSocketEvent.DISPLAY, 3),
    sendUpdateSocketClient: (displaySettings: any) =>
      socket?.emit('update-socket-client', displaySettings),
    requestClientIdentification: (data: any) =>
      socket?.emit('request-client-identification', data),
    requestClientRefresh: (data: any) =>
      socket?.emit('request-client-refresh', data),
    requestAllClientsIdentification: (data: { clients: any[] }) =>
      socket?.emit('request-all-clients-identification', data),
    sendUpdateFrcFmsSettings: (hwFingerprint: string) =>
      socket?.emit('update-frc-fms-settings', hwFingerprint),
    sendFCSPacket: (packet: FieldControlUpdatePacket) =>
      socket?.emit('fcs:update', packet)
  };

  return {
    worker: remoteRef.current,
    events,
    connected,
    ready,
    initialized
  };
}
