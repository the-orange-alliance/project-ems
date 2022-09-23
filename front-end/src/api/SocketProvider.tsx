import {
  createSocket,
  LED_CARBON,
  LED_FIELDFAULT,
  LED_PRESTART,
  MOTOR_DISABLE,
  MOTOR_FORWARD
} from '@toa-lib/client';
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
        console.log('CONNECTING AGAIN');
        socket?.emit('rooms', ['match', 'fcs']);
      });
      socket.on('disconnect', (reason) => {
        console.log('DISCONNECT HAPPENED', reason);
        setConnected(false);
      });
      socket.on('connect_error', (err) => {
        console.log(`connect_error due to ${err}`);
      });
    }
  };

  return [socket, connected, setupSocket];
};

/* Utility/helper functions for socket state */
export function sendPrestart(matchKey: string): void {
  socket?.emit('match:prestart', matchKey);
  // socket?.emit('fcs:update', LED_PRESTART);
}

export function setDisplays(): void {
  socket?.emit('match:display');
}

export async function prepareField(duration: number): Promise<void> {
  return new Promise((resolve) => {
    // socket?.emit('fcs:update', LED_CARBON);
    // socket?.emit('fcs:update', MOTOR_FORWARD);
    setTimeout(() => {
      // socket?.emit('fcs:update', MOTOR_DISABLE);
      resolve();
    }, duration);
  });
}

export function sendStartMatch(): void {
  socket?.emit('match:start');
}

export function sendAbortMatch(): void {
  socket?.emit('match:abort');
  // socket?.emit('fcs:update', LED_FIELDFAULT);
}

type TimingCallback = () => void;

export function setupMatchListeners(
  matchStart: (data: any) => void,
  autoStart: TimingCallback,
  teleStart: TimingCallback,
  endGameStart: TimingCallback,
  matchEnd: TimingCallback,
  matchAbort: TimingCallback
): void {
  socket?.on('match-start', matchStart);
  socket?.on('match:auto', autoStart);
  socket?.on('match:tele', teleStart);
  socket?.on('match:endgame', endGameStart);
  socket?.on('match:end', matchEnd);
  socket?.on('match:abort', matchAbort);
}

export function removeMatchListeners(): void {
  socket?.removeAllListeners('match-start');
  socket?.removeAllListeners('match:auto');
  socket?.removeAllListeners('match:tele');
  socket?.removeAllListeners('match:endgame');
  socket?.removeAllListeners('match:end');
  socket?.removeAllListeners('match:abort');
}

export default socket;
