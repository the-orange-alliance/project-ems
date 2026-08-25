import { atom } from 'jotai';
import { SocketService } from '@workers/shared-socket-worker.js';
import * as Comlink from 'comlink';

export const socketWorkerAtom = atom<Comlink.Remote<SocketService> | null>(
  null
);
export const socketWorkerConnectedAtom = atom<boolean>(false);
export const socketWorkerReadyAtom = atom<boolean>(false);
