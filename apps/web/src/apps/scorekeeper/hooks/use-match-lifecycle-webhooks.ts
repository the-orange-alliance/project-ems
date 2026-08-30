import { MatchSocketEvent, WebhookEvent } from '@toa-lib/models';
import { useAtomCallback } from 'jotai/utils';
import { useCallback, useEffect, useMemo } from 'react';
import { proxy } from 'comlink';
import { webhooksApi } from 'src/api/use-webhook-data.js';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { matchAtom } from 'src/stores/state/event.js';

/**
 * Emits the two webhooks that are driven by the match timer rather than by an
 * operator action: `MATCH_ENDGAME` and `MATCH_ENDED`.
 *
 * Every other webhook is emitted from the scorekeeper control that causes it
 * (prestart, set displays, prep field, commit, post). These two have no such
 * control — the realtime room broadcasts them off its own timer — so they need
 * a socket subscriber instead.
 *
 * Mounted from `ScorekeeperApp` rather than from `ConnectionManager`, which is
 * where the app already subscribes to these same events. `ConnectionManager`
 * lives in `App.tsx` and therefore runs in *every* open tab — audience
 * displays, referee tablets, field monitors — so emitting from there would
 * send one webhook per open tab. Scoping to the scorekeeper gives the same
 * one-emit-per-event behavior the other seven webhooks already rely on.
 *
 * Note this shares their caveat: two scorekeeper tabs open on the same event
 * will double-emit, exactly as they would for `PRESTARTED` today.
 */
export const useMatchLifecycleWebhooks = () => {
  const { worker, connected } = useSocketWorker();

  const emitForCurrentMatch = useAtomCallback(
    useCallback((get, _set, event: WebhookEvent) => {
      const match = get(matchAtom);
      // EmitWebhooks refuses a non-match payload, but there is no point making
      // the round trip when no match is loaded.
      if (!match) return;
      webhooksApi.create.emit(event, match);
    }, [])
  );

  const endgameProxy = useMemo(
    () => proxy(() => emitForCurrentMatch(WebhookEvent.MATCH_ENDGAME)),
    [emitForCurrentMatch]
  );
  const endProxy = useMemo(
    () => proxy(() => emitForCurrentMatch(WebhookEvent.MATCH_ENDED)),
    [emitForCurrentMatch]
  );

  useEffect(() => {
    if (!worker || !connected) return;
    worker.on(MatchSocketEvent.ENDGAME, endgameProxy);
    worker.on(MatchSocketEvent.END, endProxy);
    return () => {
      worker.off(MatchSocketEvent.ENDGAME, endgameProxy);
      worker.off(MatchSocketEvent.END, endProxy);
    };
  }, [worker, connected, endgameProxy, endProxy]);
};
