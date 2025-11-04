import { useEffect, useRef, useState } from 'react';
import * as Comlink from 'comlink';
import workerUrl from '@workers/shared-match-timer-worker.js?sharedworker&url';

export function useMatchTimerWorker() {
  const workerRef = useRef<SharedWorker | null>(null);
  const remoteRef = useRef<any>(null);

  const [mode, setMode] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [inProgress, setInProgress] = useState(false);

  useEffect(() => {
    const worker = new SharedWorker(new URL(workerUrl, import.meta.url), {
      type: 'module',
      name: '[EMS] Shared Match Timer'
    });

    workerRef.current = worker;
    worker.port.start();
    const remote = Comlink.wrap(worker.port);
    remoteRef.current = remote;

    worker.port.onmessage = (ev) => {
      if (!ev.data?.__timer) return;
      setTimeLeft(ev.data.timeLeft);
      setMode(ev.data.mode);
      setInProgress(ev.data.inProgress);
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
    start: () => remoteRef.current?.start(),
    stop: () => remoteRef.current?.stop(),
    abort: () => remoteRef.current?.abort(),
    reset: () => remoteRef.current?.reset(),
    setConfig: (c: any) => remoteRef.current?.setConfig(c),
    getState: () => remoteRef.current?.getState()
  };
}
