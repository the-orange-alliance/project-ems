import { useEffect, useRef } from 'react';
import type { TimerEventName } from '@workers/shared-match-timer-worker.js';
import type { SubscribeToTimer, TimerListener } from './use-timer-worker.js';

export type TimerSubscriptionConfig = {
  key: TimerEventName;
  callback: TimerListener;
};

/**
 * Timer counterpart of `useSocketSubscriptions`: the callbacks may change on
 * every render, but listeners are only re-registered when the set of events
 * changes. The timer worker is event-based, so there is no connection to wait for.
 */
export const useTimerSubscriptions = (
  subscribe: SubscribeToTimer,
  subscriptions: TimerSubscriptionConfig[]
) => {
  const subscriptionsRef = useRef(subscriptions);
  subscriptionsRef.current = subscriptions;

  const subscriptionKey = subscriptions.map(({ key }) => key).join('|');

  useEffect(() => {
    // Each listener lives as long as this effect and forwards to the latest callback.
    const unsubscribers = subscriptionsRef.current.map(({ key }, index) =>
      subscribe(key, (message) =>
        subscriptionsRef.current[index]?.callback(message)
      )
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [subscribe, subscriptionKey]);
};
