/// <reference lib="webworker" />
import { createSocket, SocketOptions } from '@toa-lib/client';
import { Socket } from 'socket.io-client';
import * as Comlink from 'comlink';
import { AnyCb } from './types.js';
import { EventBus, eventBus } from './util/event-bus.js';

interface SocketProperties {
  host: string;
  port: number;
}

export interface SocketService extends EventBus {
  initialize: (token: string, props: SocketProperties) => void;
  destroy: () => void;
  registerClient: () => void;
  unregisterClient: () => void;

  emit: (key: string, data?: any) => void;

  subscribeConnected: (cb: (v: boolean) => void) => void;
  subscribeReady: (cb: (v: boolean) => void) => void;
  unsubscribeConnected: (cb: (v: boolean) => void) => void;
  unsubscribeReady: (cb: (v: boolean) => void) => void;

  getConnected: () => boolean;
  getReady: () => boolean;
  getLastEvent: (key: string) => any | undefined;
}
let socket: Socket | null = null;
let connected = false;
let ready = false;
let clientCount = 0;

// broadcast subscriber sets
const stateListeners = {
  connected: new Set<AnyCb<boolean>>(),
  ready: new Set<AnyCb<boolean>>()
};

function safeCall(event: string, cb: AnyCb<any>, data: any) {
  try {
    cb(data);
  } catch (err) {
    console.error(`[worker] listener error for '${event}'`, err);
  }
}

function notifyConnected(v: boolean) {
  connected = v;
  for (const cb of Array.from(stateListeners.connected)) cb(v);
}

function notifyReady(v: boolean) {
  ready = v;
  for (const cb of Array.from(stateListeners.ready)) cb(v);
}

function fanoutEvent(event: string, data: any) {
  socketService.lastEventPayload.set(event, data);

  const listeners = socketService.eventListeners.get(event);
  if (!listeners) return;

  for (const cb of listeners) {
    try {
      safeCall(event, cb, data);
    } catch (err) {
      console.error(`[worker] listener failed for ${event}`, err);
    }
  }
}

function ensureSocket(token: string, props: SocketProperties) {
  if (socket) return;

  SocketOptions.host = props.host;
  SocketOptions.port = props.port;

  socket = createSocket(token);

  socket.on('connect', () => {
    console.log('[worker] socket CONNECT');
    notifyConnected(true);
    socket?.emit('rooms', ['match', 'fcs', 'frc-fms']);
    notifyReady(true);
  });

  socket.on('disconnect', (reason) => {
    console.log('[worker] socket DISCONNECT:', reason);
    notifyConnected(false);
    notifyReady(false);
  });

  socket.on('connect_error', (err) => {
    console.log('[worker] connect_error:', err);
  });

  socket.on('error', (err: any) => {
    console.error('[worker] socket error:', err);
    notifyReady(false);
  });

  socket.io.on('reconnect', (attempts) => {
    console.log('[worker] RECONNECTED after', attempts);
  });

  socket.onAny((event: string, data: any) => {
    console.log('[worker] socket event:', event, data);
    fanoutEvent(event, data);
  });
}

export const socketService: SocketService = {
  initialize(token: string, props: SocketProperties) {
    ensureSocket(token, props);
  },
  registerClient() {
    clientCount++;
  },
  unregisterClient() {
    clientCount = Math.max(0, clientCount - 1);
    if (clientCount === 0) {
      socketService.destroy();
    }
  },
  emit(key, data) {
    socket?.emit(key, data);
  },
  subscribeConnected(cb) {
    stateListeners.connected.add(cb);
    cb(connected);
  },
  subscribeReady(cb) {
    stateListeners.ready.add(cb);
    cb(ready);
  },
  unsubscribeConnected(cb) {
    stateListeners.connected.delete(cb);
  },
  unsubscribeReady(cb) {
    stateListeners.ready.delete(cb);
  },
  getConnected() {
    return connected;
  },
  getReady() {
    return ready;
  },
  getLastEvent(key) {
    return this.lastEventPayload.get(key);
  },

  destroy() {
    socket?.offAny();
    socket?.removeAllListeners();
    socket?.disconnect();
    console.log('[worker] socket destroyed');
    socket = null;
    connected = false;
    ready = false;
    notifyConnected(false);
    notifyReady(false);
    this.lastEventPayload.clear();
  },
  ...eventBus
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
self.onconnect = (event: MessageEvent) => {
  const [port] = event.ports;
  port.start();
  Comlink.expose(socketService, port);

  port.postMessage({
    type: 'state',
    connected,
    ready
  });
};
