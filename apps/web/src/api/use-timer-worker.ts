import { useCallback, useEffect, useRef, useState } from 'react';
import * as Comlink from 'comlink';
import { MatchConfiguration } from '@toa-lib/models';
import type {
  MatchTimerWorkerAPI,
  TimerEventName,
  TimerMessage
} from '@workers/shared-match-timer-worker.js';
import workerUrl from '@workers/shared-match-timer-worker.js?sharedworker&url';

export type TimerListener = (message: TimerMessage) => void;

/** Listens for one timer event; returns a function that stops listening. */
export type SubscribeToTimer = (
  event: TimerEventName,
  listener: TimerListener
) => () => void;

export function useMatchTimerWorker() {
  const workerRef = useRef<SharedWorker | null>(null);
  const remoteRef = useRef<Comlink.Remote<MatchTimerWorkerAPI> | null>(null);
  // Kept outside the effect so `subscribe` works from the first render.
  const listeners = useRef(new Map<TimerEventName, Set<TimerListener>>());

  const [mode, setMode] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [inProgress, setInProgress] = useState(false);

  const subscribe = useCallback<SubscribeToTimer>((event, listener) => {
    const forEvent = listeners.current.get(event) ?? new Set<TimerListener>();
    forEvent.add(listener);
    listeners.current.set(event, forEvent);
    return () => {
      forEvent.delete(listener);
    };
  }, []);

  useEffect(() => {
    const worker = new SharedWorker(new URL(workerUrl, import.meta.url), {
      type: 'module',
      name: '[EMS] Shared Match Timer'
    });

    workerRef.current = worker;
    worker.port.start();
    remoteRef.current = Comlink.wrap<MatchTimerWorkerAPI>(worker.port);

    worker.port.onmessage = (ev: MessageEvent<TimerMessage>) => {
      const message = ev.data;
      if (!message?.__timer) return;
      setTimeLeft(message.timeLeft);
      setMode(message.mode);
      setInProgress(message.inProgress);
      if (!message.event) return;
      for (const listener of listeners.current.get(message.event) ?? []) {
        listener(message);
      }
    };
    return () => {
      worker.port.postMessage('disconnect');
      worker.port.close();
    };
  }, []);

  return {
    worker: remoteRef.current,
    timeLeft,
    mode,
    inProgress,
    subscribe,
    start: () => remoteRef.current?.start(),
    stop: () => remoteRef.current?.stop(),
    abort: () => remoteRef.current?.abort(),
    reset: () => remoteRef.current?.reset(),
    setConfig: (config: MatchConfiguration) =>
      remoteRef.current?.setConfig(config),
    getState: () => remoteRef.current?.getState()
  };
}
