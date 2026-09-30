import {
  GraphicsSocketEvent,
  MatchKey,
  MatchSocketEvent
} from '@toa-lib/models';
import { FC, useCallback, useEffect, useRef } from 'react';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { useSocketSubscriptions } from 'src/api/use-socket-subscriptions.js';
import * as Events from 'src/api/events/index.js';
import { useAtomValue, useSetAtom } from 'jotai';
import { eventKeyAtom } from 'src/stores/state/event.js';
import {
  playbackDeliveryForEventAtom,
  playbackDeliveryMapAtom
} from 'src/stores/state/graphics.js';
import { usePlaybackHydrationRecovery } from 'src/api/playback-hydration-recovery.js';

/**
 * How long a subscribe may sit in `hydrating` before it is called a failure.
 *
 * The relay names the cause when it knows one (see
 * `GraphicsSocketEvent.PLAYBACK_HYDRATION_ERROR_V1`), and that arrives long
 * before this fires - this is only the backstop for the case where nothing
 * comes back AT ALL (a relay that never answers the subscribe), which is
 * otherwise indistinguishable from a slow one.
 */
export const HYDRATION_TIMEOUT_MS = 8000;
export const HYDRATION_TIMEOUT_REASON =
  'The graphics relay did not answer the subscribe with authoritative playback state.';

export const ConnectionManager: FC = () => {
  const { worker, connected } = useSocketWorker();
  const eventKey = useAtomValue(eventKeyAtom);
  const setPlaybackDeliveryMap = useSetAtom(playbackDeliveryMapAtom);
  const playbackDelivery = useAtomValue(playbackDeliveryForEventAtom(eventKey));
  const { recover } = usePlaybackHydrationRecovery();

  /** The event whose current hydration failure has already been auto-recovered. */
  const autoRecoveredFor = useRef<string | null>(null);

  /** Aborts an in-flight recovery when this subscription ends. */
  const recoveryAbort = useRef<AbortController | null>(null);

  const handleDisplay = Events.useDisplayEvent();
  const handleCommit = Events.useCommitEvent();
  const handleUpdate = Events.useMatchUpdateEvent();
  const handlePrestart = Events.usePrestartEvent();
  const handlePlaybackState = Events.usePlaybackStateEvent();
  const handlePlaybackHydrationError = Events.usePlaybackHydrationErrorEvent();
  const handleGraphicsPreviewReplay = Events.useGraphicsPreviewReplayEvent();

  const {
    handleMatchAbort,
    handleMatchEnd,
    handleMatchEndgame,
    handleMatchPrestart,
    handleMatchStart,
    handleMatchTeleop
  } = Events.useMatchStateEvents();

  const handlePrestartEvents = useCallback(
    (key: MatchKey) => {
      handlePrestart(key);
      handleMatchPrestart();
    },
    [handlePrestart, handleMatchPrestart]
  );

  const subscriptions = [
    {
      key: MatchSocketEvent.ABORT,
      callback: handleMatchAbort
    },
    {
      key: MatchSocketEvent.END,
      callback: handleMatchEnd
    },
    {
      key: MatchSocketEvent.ENDGAME,
      callback: handleMatchEndgame
    },
    {
      key: MatchSocketEvent.TELEOPERATED,
      callback: handleMatchTeleop
    },
    {
      key: MatchSocketEvent.START,
      callback: handleMatchStart
    },
    {
      key: MatchSocketEvent.UPDATE,
      callback: handleUpdate
    },
    {
      key: MatchSocketEvent.DISPLAY,
      callback: handleDisplay
    },
    {
      key: MatchSocketEvent.COMMIT,
      callback: handleCommit
    },
    {
      key: MatchSocketEvent.PRESTART,
      callback: handlePrestartEvents
    },
    ...(eventKey
      ? [
          {
            key: GraphicsSocketEvent.PLAYBACK_STATE_V1,
            callback: handlePlaybackState,
            messageKey: eventKey
          },
          {
            key: GraphicsSocketEvent.PLAYBACK_HYDRATION_ERROR_V1,
            callback: handlePlaybackHydrationError,
            messageKey: eventKey
          },
          {
            key: GraphicsSocketEvent.PREVIEW_REPLAY,
            callback: handleGraphicsPreviewReplay,
            messageKey: eventKey
          }
        ]
      : [])
  ];

  const handleSubscriptionsReady = useCallback(async () => {
    if (!eventKey) return;

    // Idempotent on purpose: returning a NEW map for a phase that is
    // already `hydrating` re-renders this component, and this component's
    // render feeds the dependencies of this very effect. That is a loop
    // with no exit, so an unchanged phase must write nothing at all.
    setPlaybackDeliveryMap((previous) =>
      previous[eventKey]?.phase === 'hydrating' &&
      previous[eventKey]?.error === null
        ? previous
        : {
            ...previous,
            [eventKey]: { phase: 'hydrating', error: null }
          }
    );

    // Subscribe only after the listener exists so a fast initial replay
    // cannot race ahead of registration.
    await worker?.emit('graphics:subscribe', { eventKey });
  }, [worker, eventKey, setPlaybackDeliveryMap]);

  const handleSubscriptionsDispose = useCallback(async () => {
    if (eventKey) {
      await worker?.emit('graphics:unsubscribe', { eventKey });
    }
  }, [worker, eventKey]);

  useSocketSubscriptions(
    worker,
    connected,
    subscriptions,
    handleSubscriptionsReady,
    handleSubscriptionsDispose
  );

  useEffect(() => {
    if (!worker) return;
    if (!connected) {
      if (eventKey)
        setPlaybackDeliveryMap((previous) => ({
          ...previous,
          [eventKey]: { phase: 'disconnected', error: null }
        }));
      return;
    }
    worker.emit(MatchSocketEvent.SYNC);
  }, [worker, connected, eventKey, setPlaybackDeliveryMap]);

  // Backstop for a relay that answers the subscribe with nothing at all. A
  // hydration that never completes is a failure, not a permanent "hydrating"
  // - that limbo is exactly what left the producer with disabled transport
  // and no action to take. The timer is scoped to this subscription, so it
  // cannot survive unmount, a disconnect, or an event change.
  useEffect(() => {
    if (!worker || !connected || !eventKey) return;
    if (playbackDelivery.phase !== 'hydrating') return;

    const timer = setTimeout(() => {
      setPlaybackDeliveryMap((previous) =>
        previous[eventKey]?.phase === 'hydrating'
          ? {
              ...previous,
              [eventKey]: {
                phase: 'failed',
                error: HYDRATION_TIMEOUT_REASON
              }
            }
          : previous
      );
    }, HYDRATION_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [
    worker,
    connected,
    eventKey,
    playbackDelivery.phase,
    setPlaybackDeliveryMap
  ]);

  // One abort scope per SUBSCRIPTION, deliberately not per attempt: a
  // recovery marks delivery `recovering` while it runs, so an effect that
  // aborted whenever the phase changed would cancel the very run that
  // changed it. Unmount, a disconnect, and an event change are the only
  // things that may cancel a recovery - and they must, or a late response
  // would be applied for an event this client no longer has selected.
  useEffect(() => {
    const controller = new AbortController();
    recoveryAbort.current = controller;

    return () => {
      controller.abort();
      recoveryAbort.current = null;
    };
  }, [worker, connected, eventKey]);

  // Recover a failed hydration on our own, once per failure episode, with a
  // bounded number of backed-off authoritative reads. `autoRecoveredFor`
  // stops the attempts-exhausted `failed` from immediately re-triggering
  // them; it is released as soon as delivery leaves the failure states, so a
  // later failure is recovered again.
  useEffect(() => {
    if (!eventKey || playbackDelivery.phase !== 'failed') {
      if (
        playbackDelivery.phase !== 'failed' &&
        playbackDelivery.phase !== 'recovering'
      )
        autoRecoveredFor.current = null;

      return;
    }

    if (autoRecoveredFor.current === eventKey) return;

    const controller = recoveryAbort.current;
    if (!controller) return;

    autoRecoveredFor.current = eventKey;

    void recover(eventKey, {
      signal: controller.signal
    });
  }, [eventKey, playbackDelivery.phase, recover]);

  return null;
};
