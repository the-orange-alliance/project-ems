import { createSocket } from '@toa-lib/client';
import {
  FcsPackets,
  FieldOptions,
  MatchKey,
  MatchSocketEvent
} from '@toa-lib/models';
import { Socket } from 'socket.io-client';
import { useRecoilState, useRecoilValue } from 'recoil';
import { socketConnectedAtom } from 'src/stores/NewRecoil';
import {
  fcsPacketsSelector,
  fieldOptionsSelector
} from '@seasons/HydrogenHorizons/stores/Recoil';

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
  socket?.emit(MatchSocketEvent.PRESTART, key);
}

export function setDisplays(): void {
  socket?.emit(MatchSocketEvent.DISPLAY, 2);
}

export function sendPrepareField(): void {
  const fieldOptions: FieldOptions = useRecoilValue(fieldOptionsSelector);
  const fcsPackets: FcsPackets = useRecoilValue(fcsPacketsSelector);
  socket?.emit('fcs:setFieldOptions', fieldOptions);
  socket?.emit('fcs:update', fcsPackets.prepareField);
}

export function sendStartMatch(): void {
  socket?.emit(MatchSocketEvent.START);
}

export async function sendAbortMatch(): Promise<void> {
  socket?.emit(MatchSocketEvent.ABORT);
}

export async function sendAllClear(): Promise<void> {
  const fcsPackets: FcsPackets = useRecoilValue(fcsPacketsSelector);
  socket?.emit('fcs:update', fcsPackets.allClear);
}

export async function sendCommitScores(key: MatchKey): Promise<void> {
  socket?.emit(MatchSocketEvent.COMMIT, key);
}

export async function sendPostResults(): Promise<void> {
  socket?.emit(MatchSocketEvent.DISPLAY, 3);
}

export async function sendUpdateFrcFmsSettings(
  hwFingerprint: string
): Promise<void> {
  socket?.emit('frc-fms:settings-update', { hwFingerprint });
}

export default socket;
