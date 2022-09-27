import { createSocket } from '@toa-lib/client';
import {
  LED_ALLCLEAR,
  LED_CARBON,
  LED_COOPERTITION,
  LED_COUNTDOWN,
  LED_FIELDFAULT,
  LED_PRESTART,
  LED_COLOR1_HB_SLOW,
  LED_COLOR2_HB_SLOW,
  LED_COLOR1_HB_MED,
  LED_COLOR2_HB_MED,
  LED_COLOR1_HB_FAST,
  LED_COLOR2_HB_FAST,
  MOTOR_DISABLE,
  MOTOR_FORWARD,
  setLEDLength
} from '@toa-lib/models';
import { Socket } from 'socket.io-client';
import { useRecoilState } from 'recoil';
import { socketConnectedAtom } from 'src/stores/Recoil';

;
let socket: Socket | null = null;
let endGameStartSpeed: string | null;

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
  // socket?.emit('fcs:update', setLEDLength(120));
}

export function setDisplays(): void {
  socket?.emit('match:display');
}

export async function prepareField(
  duration: number,
  endgameStartHBSpeed: string
): Promise<void> {
  socket?.emit('fcs:update', LED_COUNTDOWN);
  await new Promise((resolve) => setTimeout(resolve, 250));
  endGameStartSpeed = endgameStartHBSpeed;
  return new Promise((resolve) => {
    const countdown = async () => {
      for (let i = 120; i >= 0; i = i - 4) {
        socket?.emit('fcs:update', setLEDLength(i));
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    };
    countdown();
    socket?.emit('fcs:update', MOTOR_FORWARD);
    setTimeout(() => {
      socket?.emit('fcs:update', MOTOR_DISABLE);
      resolve();
    }, duration);
  });
}

export function sendStartMatch(): void {
  socket?.emit('match:start');
  socket?.emit('fcs:update', LED_CARBON);
}

export function sendAbortMatch(): void {
  socket?.emit('match:abort');
  socket?.emit('fcs:update', LED_FIELDFAULT);
}

/* TODO - this is game-specific */
export function updateSink(carbonPoints: number): void {
  const normalized = Math.min(Math.max(carbonPoints, 0), 120);
  socket?.emit('fcs:update', setLEDLength(normalized));
  if (carbonPoints >= 165 * 0.66) {
    socket?.emit('fcs:update', LED_COOPERTITION);
  }
}

export async function endGameFlash(carbonPoints: number): Promise<void> {
  // for (let i = 0; i < 3; i++) {
  socket?.emit('fcs:update', setLEDLength(120));
  await new Promise((resolve) => setTimeout(resolve, 250));
  switch (endGameStartSpeed) {
    case 'slow':
      if (carbonPoints > 60) {
        socket?.emit('fcs:update', LED_COLOR2_HB_SLOW);
      } else {
        socket?.emit('fcs:update', LED_COLOR1_HB_SLOW);
      }
      break;
    case 'medium':
      if (carbonPoints > 60) {
        socket?.emit('fcs:update', LED_COLOR2_HB_MED);
      } else {
        socket?.emit('fcs:update', LED_COLOR1_HB_MED);
      }
      break;
    case 'fast':
      if (carbonPoints > 60) {
        socket?.emit('fcs:update', LED_COLOR2_HB_FAST);
      } else {
        socket?.emit('fcs:update', LED_COLOR1_HB_FAST);
      }
      break;
    default:
      break;
  }

  //   socket?.emit('fcs:update', setLEDLength(0));
  //   await new Promise((resolve) => setTimeout(resolve, 250));
  // }
  // await new Promise((resolve) => setTimeout(resolve, 500));

  socket?.emit('fcs:update', updateSink(carbonPoints));
}

export async function commitScores(): Promise<void> {
  socket?.emit('fcs:update', setLEDLength(120));
  await new Promise((resolve) => setTimeout(resolve, 250));
  socket?.emit('fcs:update', LED_ALLCLEAR);
}

export default socket;
