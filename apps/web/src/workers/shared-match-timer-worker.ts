/// <reference lib="webworker" />
import * as Comlink from 'comlink';
import { MatchTimer, MatchConfiguration } from '@toa-lib/models';
import { EventBus, eventBus } from './util/event-bus.js';

export interface MatchTimerWorkerAPI extends EventBus {
  start: () => void;
  stop: () => void;
  abort: () => void;
  reset: () => void;
  inProgress: () => boolean;
  setConfig: (cfg: MatchConfiguration) => void;
  getState: () => {
    timeLeft: number;
    mode: number;
    inProgress: boolean;
  };
}

const ports = new Set<MessagePort>();
const timer = new MatchTimer();

let lastSnapshot = {
  timeLeft: timer.timeLeft,
  mode: timer.mode,
  inProgress: timer.inProgress()
};

function snapshot() {
  lastSnapshot = {
    timeLeft: timer.timeLeft,
    mode: timer.mode,
    inProgress: timer.inProgress()
  };
}

function broadcast(msg: any) {
  snapshot();
  for (const port of ports) {
    port.postMessage({ __timer: true, ...msg });
  }
}

timer.on('timer:start', (payload) =>
  broadcast({
    event: 'timer:start',
    payload,
    timeLeft: timer.timeLeft,
    mode: timer.mode
  })
);
timer.on('timer:auto', (payload) =>
  broadcast({
    event: 'timer:auto',
    payload,
    timeLeft: timer.timeLeft,
    mode: timer.mode
  })
);
timer.on('timer:transition', (payload) =>
  broadcast({
    event: 'timer:transition',
    payload,
    timeLeft: timer.timeLeft,
    mode: timer.mode
  })
);
timer.on('timer:tele', (payload) =>
  broadcast({
    event: 'timer:tele',
    payload,
    timeLeft: timer.timeLeft,
    mode: timer.mode
  })
);
timer.on('timer:endgame', (payload) =>
  broadcast({
    event: 'timer:endgame',
    payload,
    timeLeft: timer.timeLeft,
    mode: timer.mode
  })
);
timer.on('timer:end', (payload) =>
  broadcast({
    event: 'timer:end',
    payload,
    timeLeft: timer.timeLeft,
    mode: timer.mode
  })
);
timer.on('timer:abort', (payload) =>
  broadcast({
    event: 'timer:abort',
    payload,
    timeLeft: timer.timeLeft,
    mode: timer.mode
  })
);

const originalTick = timer.tick.bind(timer);
timer.tick = () => {
  originalTick();
  broadcast({
    event: 'timer:tick',
    timeLeft: timer.timeLeft,
    mode: timer.mode
  });
};

const api = {
  start: () => timer.start(),
  stop: () => timer.stop(),
  abort: () => timer.abort(),
  reset: () => timer.reset(),
  inProgress: () => timer.inProgress(),
  setConfig: (cfg: MatchConfiguration) => {
    timer.matchConfig = cfg;
  },
  getState: () => ({
    timeLeft: timer.timeLeft,
    mode: timer.mode,
    inProgress: timer.inProgress()
  }),
  ...eventBus
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
self.onconnect = (event: MessageEvent) => {
  const [port] = event.ports;
  ports.add(port);
  port.start();

  port.postMessage({ __timer: true, ...lastSnapshot, type: 'timer:state' });

  // Use addEventListener so we don't overwrite Comlink's internal handler
  const onMsg = (e: MessageEvent) => {
    if (e.data === 'disconnect') {
      ports.delete(port);
      if (ports.size === 0 && timer.inProgress()) timer.stop();
      port.removeEventListener('message', onMsg);
    }
  };
  port.addEventListener('message', onMsg);

  Comlink.expose(api, port);
};
