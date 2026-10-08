import { FGC_MATCH_CONFIG, MatchSocketEvent } from '@toa-lib/models';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  abort: vi.fn(),
  reset: vi.fn(),
  setConfig: vi.fn(),
  socketArgs: undefined as unknown as unknown[],
  timerSubscriptions: undefined as unknown as { key: string }[]
}));

vi.mock('src/api/use-socket-worker.js', () => ({
  useSocketWorker: () => ({ worker: {}, connected: true })
}));
vi.mock('src/api/use-socket-subscriptions.js', () => ({
  useSocketSubscriptions: (...args: unknown[]) => {
    mocks.socketArgs = args;
  }
}));
vi.mock('src/api/use-timer-worker.js', () => ({
  useMatchTimerWorker: () => ({
    timeLeft: 150,
    subscribe: vi.fn(),
    start: mocks.start,
    abort: mocks.abort,
    reset: mocks.reset,
    setConfig: mocks.setConfig
  })
}));
vi.mock('src/api/use-timer-subscriptions.js', () => ({
  useTimerSubscriptions: (
    _subscribe: unknown,
    subscriptions: { key: string }[]
  ) => {
    mocks.timerSubscriptions = subscriptions;
  }
}));
vi.mock('src/apps/audience-display/audio/timer-cues.js', () => ({
  TIMER_CUE_EVENTS: ['timer:start', 'timer:tele', 'timer:endgame', 'timer:end'],
  playTimerCue: vi.fn()
}));

import { MatchTimer } from './match-timer.js';

type Handler = (...args: unknown[]) => void;

/** The handlers MatchTimer registered with the socket, and its ready/dispose hooks. */
const socket = () => {
  const [, , subscriptions, onReady, onDispose] = mocks.socketArgs as [
    unknown,
    unknown,
    { key: string; callback: Handler }[],
    () => void,
    () => void
  ];
  const handler = (key: string) =>
    subscriptions.find((s) => s.key === key)!.callback;
  return {
    keys: subscriptions.map((s) => s.key),
    prestart: handler(MatchSocketEvent.PRESTART),
    start: handler(MatchSocketEvent.START),
    abort: handler(MatchSocketEvent.ABORT),
    onReady,
    onDispose
  };
};

describe('MatchTimer', () => {
  beforeEach(() => {
    render(<MatchTimer />);
  });

  it('shows the time left', () => {
    expect(screen.getByText('2:30')).toBeInTheDocument();
  });

  it('only uses the socket to start, ready and stop the clock', () => {
    expect(socket().keys).toEqual([
      MatchSocketEvent.PRESTART,
      MatchSocketEvent.START,
      MatchSocketEvent.ABORT
    ]);
  });

  it('ignores events replayed while the socket subscribes', () => {
    const { prestart, start, abort } = socket();

    prestart({ eventKey: 'FGC_2026-X', tournamentKey: 't', id: 1 });
    start();
    abort();

    expect(mocks.setConfig).not.toHaveBeenCalled();
    expect(mocks.reset).not.toHaveBeenCalled();
    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.abort).not.toHaveBeenCalled();
  });

  it('follows live events once subscribed', () => {
    const { prestart, start, abort, onReady } = socket();
    onReady();

    prestart({ eventKey: 'FGC_2026-X', tournamentKey: 't', id: 1 });
    start();
    abort();

    expect(mocks.setConfig).toHaveBeenCalledWith(FGC_MATCH_CONFIG);
    expect(mocks.reset).toHaveBeenCalledTimes(1);
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(mocks.abort).toHaveBeenCalledTimes(1);
  });

  it('ignores events again once the subscription is torn down', () => {
    const { start, onReady, onDispose } = socket();
    onReady();
    onDispose();

    start();

    expect(mocks.start).not.toHaveBeenCalled();
  });

  it('plays no sounds unless audio is on', () => {
    expect(mocks.timerSubscriptions).toEqual([]);
  });
});

describe('MatchTimer with audio', () => {
  it('plays a sound for each timer cue', () => {
    render(<MatchTimer audio />);
    expect(mocks.timerSubscriptions.map((s) => s.key)).toEqual([
      'timer:start',
      'timer:tele',
      'timer:endgame',
      'timer:end'
    ]);
  });
});
