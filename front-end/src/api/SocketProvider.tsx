import { createSocket } from '@toa-lib/client';
import {
  LED_CARBON,
  LED_FIELDFAULT,
  LED_PRESTART,
  MOTOR_DISABLE,
  MOTOR_FORWARD,
  setLEDLength
} from '@toa-lib/models';
import { Socket } from 'socket.io-client';
import { useRecoilState } from 'recoil';
import { socketConnectedAtom } from 'src/stores/Recoil';

let socket: Socket | null = null;

export function destroySocket() {
  socket?.off('connect');
  socket?.off('disconnect');
  socket?.disconnect();
  console.log('client disconnected');
  socket = null;
}

export const useSocket = (): [
  Socket | null,
  boolean,
  (token: string) => void
] => {
  const [connected, setConnected] = useRecoilState(socketConnectedAtom);

  const setupSocket = (token: string) => {
    if (socket) return;
    socket = createSocket(token);
    initEvents();
  };

  const initEvents = () => {
    if (socket) {
      socket.on('connect', () => {
        setConnected(true);
        console.log('CONNECTED');
        socket?.emit('rooms', ['match', 'fcs']);
      });
      socket.on('disconnect', (reason) => {
        console.log('DISCONNECT', reason);
        setConnected(false);
      });
      socket.on('connect_error', (err) => {
        console.log(`connect_error due to ${err}`);
      });
      socket.on('error', (err) => {
        console.error(err);
        if (err.description) throw err.description;
        else throw err;
      });
    }
  };

  return [socket, connected, setupSocket];
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

/* TODO - this is game-specific */
export function updateSink(carbonPoints: number): void {
  const normalized = Math.min(Math.max(carbonPoints, 0), 120);
  socket?.emit('fcs:update', setLEDLength(normalized));
}

export default socket;
