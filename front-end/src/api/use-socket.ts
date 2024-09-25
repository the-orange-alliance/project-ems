import { createSocket } from '@toa-lib/client';
import { Match, MatchKey, MatchSocketEvent } from '@toa-lib/models';
import { Socket } from 'socket.io-client';
import { useRecoilCallback, useRecoilState } from 'recoil';

import {
  socketConnectedAtom,
  followerModeEnabledAtom,
  leaderApiHostAtom,
  displayChromaKeyAtom,
  activeFieldsAtom
} from 'src/stores/recoil';
import { useSnackbar } from 'src/hooks/use-snackbar';
import { connectSocketClient } from './use-socket-data';
import { v4 as uuidv4 } from 'uuid';
import { useRef } from 'react';

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
  const { showSnackbar } = useSnackbar();
  const idMsgRef = useRef<any>({});

  const setupSocket = (token: string) => {
    if (socket) return;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    /* @ts-ignore */
    socket = createSocket(token);
    initEvents();
    void identify();
  };

  const identify = useRecoilCallback(({ snapshot, set }) => async () => {
    if (socket) {
      const fields = await snapshot.getPromise(activeFieldsAtom);
      const followerModeEnabled = await snapshot.getPromise(
        followerModeEnabledAtom
      );
      const leaderApiHost = await snapshot.getPromise(leaderApiHostAtom);
      const chromaKey = await snapshot.getPromise(displayChromaKeyAtom);

      // ID Message
      let persistantClientId = localStorage.getItem('persistantClientId');

      // If no persistantClientId is found, generate a new one and save it
      if (!persistantClientId || persistantClientId === 'undefined') {
        persistantClientId = uuidv4();
        localStorage.setItem('persistantClientId', persistantClientId);
      }

      idMsgRef.current = {
        currentUrl: window.location.href,
        fieldNumbers: fields.map((d: any) => d.field).join(','),
        followerMode: followerModeEnabled ? 1 : 0,
        followerApiHost: leaderApiHost,
        audienceDisplayChroma: (chromaKey ?? '').replaceAll('"', '')
      };

      if (persistantClientId) {
        idMsgRef.current.persistantClientId = persistantClientId;
      }

      socket.on('settings', (data) => {
        // TODO: Make this get the field names properly
        set(
          activeFieldsAtom,
          data.fieldNumbers
            .split(',')
            .map((d: any) => ({ field: parseInt(d), name: `Field ${d}` }))
        );
        set(followerModeEnabledAtom, data.followerMode === 1);
        // TODO: Setter for this may be broken, investigate this later
        // set(leaderApiHostAtom, data.followerApiHost);
        set(displayChromaKeyAtom, data.audienceDisplayChroma);
        localStorage.setItem('persistantClientId', data.persistantClientId);
      });

      socket.on('identify-response', (data) => {
        connectSocketClient(data);
        idMsgRef.current = data;
        localStorage.setItem('persistantClientId', data.persistantClientId);
      });

      socket.on('identify-client', () => {
        showSnackbar(
          `My unique ID is ${localStorage.getItem(
            'persistantClientId'
          )}, talking on socket ${socket?.id}`,
          'success'
        );
      });

      socket.on('refresh-client', () => {
        window.location.reload();
      });

      socket.io.on('reconnect', (a) => {
        console.log(`Reconnected after ${a} attempts`);
        socket?.emit('identify', idMsgRef.current);
      });

      socket.emit('identify', idMsgRef.current);
    }
    // set(currentTournamentFieldsAtom, [])
  });

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

export function sendUpdate(match: Match<any>): void {
  socket?.emit(MatchSocketEvent.UPDATE, match);
}

export function setDisplays(): void {
  socket?.emit(MatchSocketEvent.DISPLAY, 2);
}

export function once(
  key: MatchSocketEvent | string,
  callback: (data: any) => void
): void {
  socket?.once(key, callback);
}

export function sendStartMatch(): void {
  socket?.emit(MatchSocketEvent.START);
}

export async function sendAbortMatch(): Promise<void> {
  socket?.emit(MatchSocketEvent.ABORT);
}

export async function sendCommitScores(key: MatchKey): Promise<void> {
  socket?.emit(MatchSocketEvent.COMMIT, key);
}

export async function sendPostResults(): Promise<void> {
  socket?.emit(MatchSocketEvent.DISPLAY, 3);
}

// TODO: Use model for this
export async function sendUpdateSocketClient(
  displaySettings: any
): Promise<void> {
  socket?.emit('update-socket-client', displaySettings);
}

export async function requestClientIdentification(data: any): Promise<void> {
  socket?.emit('identify-client', data);
}

export async function requestClientRefresh(data: any): Promise<void> {
  socket?.emit('refresh-client', data);
}

export async function requestAllClientsIdentification(data: {
  clients: any[];
}): Promise<void> {
  socket?.emit('identify-all-clients', data);
}

export async function sendUpdateFrcFmsSettings(
  hwFingerprint: string
): Promise<void> {
  socket?.emit('frc-fms:settings-update', { hwFingerprint });
}

export default socket;
