import { FGC_MATCH_CONFIG, MatchSocketEvent } from '@toa-lib/models';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  abort: vi.fn(),
  reset: vi.fn(),
  setConfig: vi.fn(),
  socketSubscriptions: [] as {
    key: string;
    callback: (...args: unknown[]) => void;
  }[],
  timerSubscriptions: [] as { key: string }[]
}));

vi.mock('src/api/use-socket-worker.js', () => ({
  useSocketWorker: () => ({ worker: {}, connected: true })
}));
vi.mock('src/api/use-socket-subscriptions.js', () => ({
  useSocketSubscriptions: (
    _worker: unknown,
    _enabled: boolean,
    subscriptions: typeof mocks.socketSubscriptions
  ) => {
    mocks.socketSubscriptions = subscriptions;
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

const handler = (key: string) =>
  mocks.socketSubscriptions.find((s) => s.key === key)!.callback;

const REPLAYED = { replayed: true };
const KEY = { eventKey: 'FGC_2026-X', tournamentKey: 't', id: 1 };

describe('MatchTimer', () => {
  beforeEach(() => {
    render(<MatchTimer />);
  });

  it('shows the time left', () => {
    expect(screen.getByText('2:30')).toBeInTheDocument();
  });

  it('only uses the socket to start, ready and stop the clock', () => {
    expect(mocks.socketSubscriptions.map((s) => s.key)).toEqual([
      MatchSocketEvent.PRESTART,
      MatchSocketEvent.START,
      MatchSocketEvent.ABORT
    ]);
  });

  it('follows live events', () => {
    handler(MatchSocketEvent.PRESTART)(KEY);
    handler(MatchSocketEvent.START)('start');
    handler(MatchSocketEvent.ABORT)();

    expect(mocks.setConfig).toHaveBeenCalledWith(FGC_MATCH_CONFIG);
    expect(mocks.reset).toHaveBeenCalledTimes(1);
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(mocks.abort).toHaveBeenCalledTimes(1);
  });

  it('ignores events replayed to a new subscription', () => {
    handler(MatchSocketEvent.PRESTART)(KEY, REPLAYED);
    handler(MatchSocketEvent.START)('start', REPLAYED);
    handler(MatchSocketEvent.ABORT)(undefined, REPLAYED);

    expect(mocks.setConfig).not.toHaveBeenCalled();
    expect(mocks.reset).not.toHaveBeenCalled();
    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.abort).not.toHaveBeenCalled();
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
