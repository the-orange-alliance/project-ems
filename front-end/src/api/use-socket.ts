import { createSocket } from '@toa-lib/client';
import {
  FcsPackets,
  FieldOptions,
  MatchKey,
  MatchSocketEvent
} from '@toa-lib/models';
import { Socket } from 'socket.io-client';
import { useRecoilCallback, useRecoilState } from 'recoil';
import {
  currentTournamentFieldsAtom,
  socketConnectedAtom
} from 'src/stores/NewRecoil';
import {
  followerModeEnabledAtom,
  leaderApiHostAtom,
  displayChromaKeyAtom
} from 'src/stores/recoil';
import { useSnackbar } from 'src/hooks/use-snackbar';
import { connectSocketClient } from './use-socket-data';

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

  const setupSocket = (token: string) => {
    if (socket) return;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    /* @ts-ignore */
    socket = createSocket(token);
    identify();
    initEvents();
  };

  const identify = useRecoilCallback(({ snapshot, set }) => async () => {
    if (socket) {
      const fields = await snapshot.getPromise(currentTournamentFieldsAtom);
      const followerModeEnabled = await snapshot.getPromise(
        followerModeEnabledAtom
      );
      const leaderApiHost = await snapshot.getPromise(leaderApiHostAtom);
      const chromaKey = await snapshot.getPromise(displayChromaKeyAtom);

      // ID Message
      const persistantClientId = localStorage.getItem('persistantClientId');

      const idMsg: any = {
        currentUrl: window.location.href,
        fieldNumbers: fields.map((d: any) => d.field).join(','),
        followerMode: followerModeEnabled ? 1 : 0,
        followerApiHost: leaderApiHost,
        audienceDisplayChroma: chromaKey.replaceAll('"', '')
      };

      if (persistantClientId) {
        idMsg.persistantClientId = persistantClientId;
      }

      socket.on('settings', (data) => {
        // TODO: Make this get the field names properly
        set(
          currentTournamentFieldsAtom,
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

      socket.emit('identify', idMsg);
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

export function setDisplays(): void {
  socket?.emit(MatchSocketEvent.DISPLAY, 2);
}

export function sendPrepareField(
  fieldOptions?: FieldOptions,
  fcsPackets?: FcsPackets
): void {
  if (fieldOptions) socket?.emit('fcs:setFieldOptions', fieldOptions);
  if (fcsPackets) socket?.emit('fcs:update', fcsPackets.prepareField);
}

export function sendStartMatch(): void {
  socket?.emit(MatchSocketEvent.START);
}

export async function sendAbortMatch(): Promise<void> {
  socket?.emit(MatchSocketEvent.ABORT);
}

export async function sendAllClear(fcsPackets?: FcsPackets): Promise<void> {
  if (fcsPackets) socket?.emit('fcs:update', fcsPackets.allClear);
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
