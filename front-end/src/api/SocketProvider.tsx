import { createSocket } from '@toa-lib/client';
import { MatchKey } from '@toa-lib/models';
import { Socket } from 'socket.io-client';
import { useRecoilState } from 'recoil';
import { socketConnectedAtom } from 'src/stores/NewRecoil';

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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    /* @ts-ignore */
    socket = createSocket(token);
    initEvents();
  };

  const initEvents = () => {
    if (socket) {
      socket.on('connect', () => {
        setConnected(true);
        console.log('CONNECTED');
        socket?.emit('rooms', ['match', 'fcs', 'frc-fms']);
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
export function sendPrestart(key: MatchKey): void {
  socket?.emit('match:prestart', key);
}

export function setDisplays(): void {
  socket?.emit('match:display', 2);
}

export function sendPrepareField(): void {
  // socket?.emit('fcs:update', LED_PRESTART);
}

export function sendStartMatch(): void {
  socket?.emit('match:start');
}

export async function sendAbortMatch(): Promise<void> {
  socket?.emit('match:abort');
}

export async function sendAllClear(): Promise<void> {
  // socket?.emit('fcs:update', LED_ALLCLEAR);
}

export async function sendCommitScores(key: MatchKey): Promise<void> {
  socket?.emit('match:commit', key);
}

export async function sendPostResults(): Promise<void> {
  socket?.emit('match:display', 3);
}

export async function sendUpdateFrcFmsSettings(hwFingerprint: string): Promise<void> {
  socket?.emit('frc-fms:settings-update', {hwFingerprint});
}

export default socket;
