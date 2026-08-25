import { useMatchControl } from './use-match-control.js';
import { MatchState, WebhookEvent } from '@toa-lib/models';
import { useAtomCallback } from 'jotai/utils';
import { useCallback } from 'react';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { emitWebhook } from 'src/api/use-webhook-data.js';
import { useSeasonFieldControl } from 'src/hooks/use-season-components.js';
import { matchAtom } from 'src/stores/state/event.js';

export const usePrepareFieldCallback = () => {
  const { canPrepField, setState } = useMatchControl();
  const fieldControl = useSeasonFieldControl();
  const { connected } = useSocketWorker();
  return useAtomCallback(
    useCallback(
      (get) => {
        const match = get(matchAtom);
        if (!connected) {
          throw new Error('Not connected to realtime service.');
        }
        if (!canPrepField) {
          throw new Error('Attempted to prepare field when not allowed.');
        }
        fieldControl?.prepareField?.();
        setState(MatchState.FIELD_READY);
        emitWebhook(WebhookEvent.FIELD_PREPPED, match);
      },
      [canPrepField, setState]
    )
  );
};
