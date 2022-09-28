import {createSocket} from '@toa-lib/client';
import {
  LED_ALLCLEAR,
  LED_CARBON,
  LED_COOPERTITION,
  LED_COUNTDOWN,
  LED_FIELDFAULT,
  LED_PRESTART,
  MatchState,
  MOTOR_DISABLE,
  MOTOR_FORWARD,
  setLEDLength,
  setLEDPattern
} from '@toa-lib/models';
import {Socket} from 'socket.io-client';
import {useRecoilState} from 'recoil';
import {socketConnectedAtom} from 'src/stores/Recoil';

let socket: Socket | null = null;
let endGameStartSpeed: number;
let endGameSpeed: number;
let endGameDuration: number;
let matchOverPattern: number;
let matchOverStlye: string | null;
const COOPERTITION: number = 165 * 0.66;
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
  socket?.emit('match:display', 2);
}

export function sendStartMatch(): void {
  socket?.emit('match:start');
  socket?.emit('fcs:update', LED_CARBON);
}

export async function prepareField(
  duration: number,
  endgameStartHBSpeed: number,
  endGameHBSpeed: number,
  egDuration: number,
  cdStyle: string,
  cdDuration: number,
  moStyle: string,
  moPattern: number
): Promise<void> {
  socket?.emit('fcs:update', LED_COUNTDOWN);
  await new Promise((resolve) => setTimeout(resolve, 250));
  endGameStartSpeed = endgameStartHBSpeed;
  endGameSpeed = endGameHBSpeed;
  endGameDuration = egDuration;
  matchOverStlye = moStyle;
  matchOverPattern = moPattern;
  return new Promise((resolve) => {
    const countdown = async () => {
      for (let i = 108; i >= 0; i = i - Math.min(108 / (cdDuration / 100))) {
        socket?.emit('fcs:update', setLEDLength(i));
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    };
    const raceLight = async () => {
      for (let i = 108; i >= 0; i = i - Math.min(108 / 3)) {
        socket?.emit('fcs:update', setLEDLength(i));
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(cdDuration / 3))
        );
      }
    };
    switch (cdStyle) {
      case 'style1':
        countdown();
        break;
      case 'style2':
        raceLight();
        break;
      default:
        break;
    }
    socket?.emit('fcs:update', MOTOR_FORWARD);
    setTimeout(() => {
      socket?.emit('fcs:update', MOTOR_DISABLE);
      resolve();
    }, duration);
  });
}

export function sendAbortMatch(): void {
  socket?.emit('match:abort');
  socket?.emit('fcs:update', LED_FIELDFAULT);
}

/* TODO - this is game-specific */
export async function updateSink(carbonPoints: number, state: string): Promise<void> {
  // console.log(state);
  const normalized = calcLedFromCm(carbonPoints);
  const endgame = (state == "ENDGAME");
  socket?.emit('fcs:update', setLEDLength(normalized));
  await new Promise((resolve) => setTimeout(resolve, 250));
  if (carbonPoints >= COOPERTITION) {
    if (endgame) {
      socket?.emit('fcs:update', setLEDPattern(1600 + endGameSpeed));
    } else {
      socket?.emit('fcs:update', LED_COOPERTITION);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  } else {
    if (endgame) {
      socket?.emit('fcs:update', setLEDPattern(1500 + endGameSpeed));
    } else {
      socket?.emit('fcs:update', LED_CARBON);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

export async function endGameFlash(carbonPoints: number): Promise<void> {
  const led = calcLedFromCm(carbonPoints);
  socket?.emit('fcs:update', setLEDLength(120));
  await new Promise((resolve) => setTimeout(resolve, 250));
  if (carbonPoints >= COOPERTITION) {
    socket?.emit('fcs:update', setLEDPattern(1600 + endGameStartSpeed));
  } else {
    socket?.emit('fcs:update', setLEDPattern(1500 + endGameStartSpeed));
  }
  // switch (endGameStartSpeed) {
  //   case 'slow':
  //     if (carbonPoints >= COOPERTITION) {
  //       socket?.emit('fcs:update', LED_COLOR2_HB_SLOW);
  //     } else {
  //       socket?.emit('fcs:update', LED_COLOR1_HB_SLOW);
  //     }
  //     break;
  //   case 'medium':
  //     if (carbonPoints >= COOPERTITION) {
  //       socket?.emit('fcs:update', LED_COLOR2_HB_MED);
  //     } else {
  //       socket?.emit('fcs:update', LED_COLOR1_HB_MED);
  //     }
  //     break;
  //   case 'fast':
  //     if (carbonPoints >= COOPERTITION) {
  //       socket?.emit('fcs:update', LED_COLOR2_HB_FAST);
  //     } else {
  //       socket?.emit('fcs:update', LED_COLOR1_HB_FAST);
  //     }
  //     break;
  //   default:
  //     break;
  // }
  await new Promise((resolve) => setTimeout(resolve, endGameDuration));
  socket?.emit('fcs:update', setLEDLength(led));
  await new Promise((resolve) => setTimeout(resolve, 250));
  if (carbonPoints >= COOPERTITION) {
    socket?.emit('fcs:update', setLEDPattern(1600 + endGameSpeed));
  } else {
    socket?.emit('fcs:update', setLEDPattern(1500 + endGameSpeed));
  }
  // break;
  // switch (endGameSpeed) {
  //   case 'slow':
  //     if (carbonPoints >= COOPERTITION) {
  //       socket?.emit('fcs:update', LED_COLOR2_HB_SLOW);
  //     } else {
  //       socket?.emit('fcs:update', LED_COLOR1_HB_SLOW);
  //     }
  //     break;
  //   case 'medium':
  //     if (carbonPoints >= COOPERTITION) {
  //       socket?.emit('fcs:update', LED_COLOR2_HB_MED);
  //     } else {
  //       socket?.emit('fcs:update', LED_COLOR1_HB_MED);
  //     }
  //     break;
  //   case 'fast':
  //     if (carbonPoints >= COOPERTITION) {
  //       socket?.emit('fcs:update', LED_COLOR2_HB_FAST);
  //     } else {
  //       socket?.emit('fcs:update', LED_COLOR1_HB_FAST);
  //     }
  //     break;
  //   default:
  //     break;
  // }
}

export async function sendCommitScores(matchKey: string): Promise<void> {
  socket?.emit('match:commit', matchKey);
  socket?.emit('fcs:update', setLEDLength(120));
  await new Promise((resolve) => setTimeout(resolve, 250));
  socket?.emit('fcs:update', LED_ALLCLEAR);
}

export function calcLedFromCm(carbon: number) {
  return Math.min(Math.floor(Math.max(carbon, 0) / 1.527), 108);
}

export async function matchOver(carbonPoints: number): Promise<void> {
  switch (matchOverStlye) {
    case 'carbon':
      updateSink(carbonPoints,"MATCH_OVER");
      break;
    case 'full':
      socket?.emit('fcs:update', setLEDLength(120));
      break;
    default:
      break;
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
  switch (matchOverPattern) {
    case 1:
      updateSink(carbonPoints, "MATCH_OVER");
      break;
    default:
      socket?.emit('fcs:update', setLEDPattern(matchOverPattern));
      break;
  }
}
export async function sendPostResults(): Promise<void> {
  socket?.emit('match:display', 3);
}

export default socket;
