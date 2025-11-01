import { useEffect, useRef, useState } from 'react';
import * as Comlink from 'comlink';
import workerUrl from '@workers/test-worker.ts?worker&url';

interface TestWorkerService {
  getCounter: () => Promise<number>;
  inc: () => Promise<void>;
}

export function useTestWorker() {
  const workerRef = useRef<Worker | null>(null);
  const serviceRef = useRef<Comlink.Remote<TestWorkerService> | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log('🔧 Creating test worker...');

    // Create the worker
    const worker = new Worker(new URL(workerUrl, import.meta.url), {
      type: 'module'
    });

    worker.onerror = (error) => {
      console.error('Test worker error:', error);
    };

    workerRef.current = worker;

    // Wrap with Comlink - store in ref, not state!
    const remote = Comlink.wrap<TestWorkerService>(worker);
    serviceRef.current = remote;
    setIsReady(true);

    console.log('🔧 Test worker ready');

    return () => {
      console.log('🔧 Cleaning up test worker');
      if (serviceRef.current) {
        serviceRef.current[Comlink.releaseProxy]();
        serviceRef.current = null;
      }
      worker.terminate();
      workerRef.current = null;
      setIsReady(false);
    };
  }, []);

  return {
    service: serviceRef.current,
    isReady
  };
}
