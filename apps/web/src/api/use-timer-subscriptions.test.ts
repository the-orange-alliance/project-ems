import { renderHook } from '@testing-library/react';
import type {
  TimerEventName,
  TimerMessage
} from '@workers/shared-match-timer-worker.js';
import { describe, expect, it, vi } from 'vitest';
import { TimerListener } from './use-timer-worker.js';
import {
  TimerSubscriptionConfig,
  useTimerSubscriptions
} from './use-timer-subscriptions.js';

const message = (event: TimerEventName): TimerMessage => ({
  __timer: true,
  event,
  payload: { allowAudio: true },
  timeLeft: 30,
  mode: 3,
  inProgress: true
});

/** A stand-in for the timer worker: `emit` delivers to whoever is subscribed. */
const makeTimer = () => {
  const listeners = new Map<TimerEventName, Set<TimerListener>>();
  const subscribe = vi.fn((event: TimerEventName, listener: TimerListener) => {
    const forEvent = listeners.get(event) ?? new Set<TimerListener>();
    forEvent.add(listener);
    listeners.set(event, forEvent);
    return () => {
      forEvent.delete(listener);
    };
  });
  const emit = (event: TimerEventName) =>
    listeners.get(event)?.forEach((listener) => listener(message(event)));
  const listenerCount = (event: TimerEventName) =>
    listeners.get(event)?.size ?? 0;
  return { subscribe, emit, listenerCount };
};

describe('useTimerSubscriptions', () => {
  it('delivers each subscribed event to its callback', () => {
    const timer = makeTimer();
    const onEnd = vi.fn();
    renderHook(() =>
      useTimerSubscriptions(timer.subscribe, [
        { key: 'timer:end', callback: onEnd }
      ])
    );

    timer.emit('timer:end');
    timer.emit('timer:tele');

    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledWith(message('timer:end'));
  });

  it('calls the latest callback without registering again', () => {
    const timer = makeTimer();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ callback }) =>
        useTimerSubscriptions(timer.subscribe, [
          { key: 'timer:end', callback }
        ]),
      { initialProps: { callback: first } }
    );

    rerender({ callback: second });
    timer.emit('timer:end');

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(timer.subscribe).toHaveBeenCalledTimes(1);
  });

  it('registers again only when the set of events changes', () => {
    const timer = makeTimer();
    const callback = vi.fn();
    const { rerender } = renderHook(
      ({ subscriptions }) =>
        useTimerSubscriptions(timer.subscribe, subscriptions),
      {
        initialProps: {
          subscriptions: [
            { key: 'timer:end', callback }
          ] as TimerSubscriptionConfig[]
        }
      }
    );

    rerender({ subscriptions: [{ key: 'timer:end', callback }] });
    expect(timer.subscribe).toHaveBeenCalledTimes(1);

    rerender({ subscriptions: [{ key: 'timer:abort', callback }] });
    expect(timer.listenerCount('timer:end')).toBe(0);
    expect(timer.listenerCount('timer:abort')).toBe(1);
  });

  it('stops listening when unmounted', () => {
    const timer = makeTimer();
    const callback = vi.fn();
    const { unmount } = renderHook(() =>
      useTimerSubscriptions(timer.subscribe, [{ key: 'timer:end', callback }])
    );

    unmount();
    timer.emit('timer:end');

    expect(callback).not.toHaveBeenCalled();
    expect(timer.listenerCount('timer:end')).toBe(0);
  });
});
