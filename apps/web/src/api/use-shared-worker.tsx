// useSharedWorkerSafe.ts
import * as Comlink from 'comlink';

export function useSharedWorkerSafe<T>(
  workerUrl: string,
  options?: WorkerOptions
) {
  const url = new URL(workerUrl, import.meta.url);

  //
  // DEV ONLY: bust the URL so the browser never reuses stale workers
  //
  if (import.meta.hot) {
    url.searchParams.set('hmr', Date.now().toString());
  }

  const worker = new SharedWorker(url, { type: 'module', ...options });

  //
  // Must start the port before using Comlink.wrap
  //
  worker.port.start();
  const remote = Comlink.wrap<T>(worker.port);

  //
  // DEV ONLY: fully dispose the worker on hot update
  //
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      try {
        worker.port.postMessage('__disconnect__');
        worker.port.close();
      } catch (e) {
        /* ignore */
        console.error(e);
      }
    });

    //
    // If THIS file changes → full page reload
    //
    import.meta.hot.accept(() => {
      location.reload();
    });
  }

  return { worker, remote };
}
