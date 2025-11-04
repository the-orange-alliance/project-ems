import { useEffect, useRef, useState } from 'react';
import * as Comlink from 'comlink';
import { SocketService } from '@workers/shared-socket-worker.js';
import workerUrl from '@workers/shared-socket-worker.js?sharedworker&url';
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

  const socket = remoteRef.current;

  useEffect(() => {
    if (!workerRef.current) {
      const worker = new SharedWorker(new URL(workerUrl, import.meta.url), {
        type: 'module',
        name: '[EMS] Shared Socket Worker'
      });
      worker.onerror = (err) => {
        console.error('SharedWorker error:', err);
      };
      setInitialized(false);
      workerRef.current = worker;
      const remote = Comlink.wrap<SocketService>(worker.port);
      worker.port.start();
      remoteRef.current = remote;

      const proxyConnected = Comlink.proxy((v: boolean) => setConnected(v));
      const proxyReady = Comlink.proxy((v: boolean) => setReady(v));

      const init = async () => {
        await remoteRef.current?.registerClient();
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
        console.log('[useSocketWorker] initialized:', c && r);
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
        } finally {
          worker.port.close();
        }
        remoteRef.current?.unregisterClient();
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
