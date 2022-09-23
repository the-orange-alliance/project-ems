import { useEffect, useState } from 'react';
import {
  createSocket,
  LED_CARBON,
  LED_FIELDFAULT,
  LED_PRESTART,
  MOTOR_DISABLE,
  MOTOR_FORWARD
} from '@toa-lib/client';
import { Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function setupSocket(token: string) {
  if (socket) return;

  socket = createSocket(token);

  socket.on('connect_error', (err) => {
    console.log(`connect_error due to ${err}`);
  });

  console.log('client connecting...');

  socket.connect();
  console.log('client connected');

  socket.emit('rooms', ['match', 'fcs']);
}

export function destroySocket() {
  socket?.disconnect();
  console.log('client disconnected');
  socket = null;
}

export const useSocket = (): [Socket | null, boolean] => {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket?.on('connect', () => {
      setConnected(true);
    });
    socket?.on('disconnect', () => {
      setConnected(false);
    });
    return () => {
      socket?.off('connect');
      socket?.off('disconnect');
    };
  }, []);

  return [socket, connected];
};

/* Utility/helper functions for socket state */
export function sendPrestart(matchKey: string): void {
  socket?.emit('match:prestart', matchKey);
  socket?.emit('fcs:update', LED_PRESTART);
}

export function setDisplays(): void {
  socket?.emit('match:display');
}

export async function prepareField(duration: number): Promise<void> {
  return new Promise((resolve) => {
    socket?.emit('fcs:update', LED_CARBON);
    socket?.emit('fcs:update', MOTOR_FORWARD);
    setTimeout(() => {
      socket?.emit('fcs:update', MOTOR_DISABLE);
      resolve();
    }, duration);
  });
}

export function sendStartMatch(): void {
  socket?.emit('match:start');
}

export function sendAbortMatch(): void {
  socket?.emit('match:abort');
  socket?.emit('fcs:update', LED_FIELDFAULT);
}

type TimingCallback = () => void;

export function setupMatchListeners(
  matchStart: TimingCallback,
  autoStart: TimingCallback,
  teleStart: TimingCallback,
  endGameStart: TimingCallback,
  matchEnd: TimingCallback,
  matchAbort: TimingCallback
): void {
  socket?.on('match:timing:start', matchStart);
  socket?.on('match:timing:auto', autoStart);
  socket?.on('match:timing:tele', teleStart);
  socket?.on('match:timing:endgame', endGameStart);
  socket?.on('match:timing:end', matchEnd);
  socket?.on('match:timing:abort', matchAbort);
}

export function removeMatchListeners(): void {
  socket?.removeAllListeners('match:timing:start');
  socket?.removeAllListeners('match:timing:auto');
  socket?.removeAllListeners('match:timing:tele');
  socket?.removeAllListeners('match:timing:endgame');
  socket?.removeAllListeners('match:timing:end');
  socket?.removeAllListeners('match:timing:abort');
}

export default socket;
