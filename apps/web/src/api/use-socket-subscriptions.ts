import { useEffect, useRef } from 'react';
import * as Comlink from 'comlink';
import type { SocketService } from '@workers/shared-socket-worker.js';

type Subscription = {
  key: string;
  id: string;
  messageKey?: string;
  replay?: boolean;
};

export type SocketSubscriptionConfig = {
  key: string;
  callback: (...args: any[]) => any;
  messageKey?: string;
  replay?: boolean;
};

export class SocketSubscriptions {
  private subscriptions: Subscription[] = [];
  private disposed = false;

  constructor(private worker: Comlink.Remote<SocketService>) {}

  async on(
    key: string,
    callback: (...args: any[]) => any,
    messageKey?: string,
    replay?: boolean
  ) {
    const id = await this.worker.on(key, callback, messageKey, replay);

    if (this.disposed) {
      await this.worker.off(key, id, messageKey);
      return;
    }

    this.subscriptions.push({
      key,
      id,
      messageKey,
      replay
    });
  }

  async onMany(configs: SocketSubscriptionConfig[]) {
    await Promise.all(
      configs.map(({ key, callback, messageKey, replay }) =>
        this.on(key, callback, messageKey, replay)
      )
    );
  }

  async dispose() {
    if (this.disposed) return;

    this.disposed = true;

    await Promise.all(
      this.subscriptions.map(({ key, id, messageKey }) =>
        this.worker.off(key, id, messageKey)
      )
    );

    this.subscriptions = [];
  }
}

export const useSocketSubscriptions = (
  worker: Comlink.Remote<SocketService> | null,
  enabled: boolean,
  subscriptions: SocketSubscriptionConfig[],
  onReady?: () => void | Promise<void>,
  onDispose?: () => void | Promise<void>
) => {
  const subscriptionsRef = useRef(subscriptions);
  const onReadyRef = useRef(onReady);
  const onDisposeRef = useRef(onDispose);

  subscriptionsRef.current = subscriptions;
  onReadyRef.current = onReady;
  onDisposeRef.current = onDispose;

  /*
   * Only subscription structure should cause re-registration.
   *
   * Callback identity changing during a React render does not mean that
   * the socket subscription itself changed.
   */
  const subscriptionKey = subscriptions
    .map(({ key, messageKey }) => `${key}:${messageKey ?? '__all__'}`)
    .join('|');

  useEffect(() => {
    if (!worker || !enabled) return;

    const manager = new SocketSubscriptions(worker);

    /*
     * Each worker callback is stable for the lifetime of this effect, while
     * forwarding to the most recent React callback through the ref.
     */
    const stableSubscriptions = subscriptionsRef.current.map(
      ({ key, messageKey, replay }, index) => ({
        key,
        messageKey,
        replay,
        callback: Comlink.proxy((...args: any[]) => {
          return subscriptionsRef.current[index]?.callback(...args);
        })
      })
    );

    let disposed = false;

    const initialize = async () => {
      await manager.onMany(stableSubscriptions);

      if (disposed) return;

      await onReadyRef.current?.();
    };

    void initialize();

    return () => {
      disposed = true;

      void onDisposeRef.current?.();
      void manager.dispose();
    };
  }, [worker, enabled, subscriptionKey]);
};
