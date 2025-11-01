import { useMatchControl } from './use-match-control.js';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { MatchState, WebhookEvent } from '@toa-lib/models';
import { useSeasonFieldControl } from 'src/hooks/use-season-components.js';
import { useModal } from '@ebay/nice-modal-react';
import { AbortDialog } from 'src/components/dialogs/abort-dialog.js';
import { useAtomCallback } from 'jotai/utils';
import { useCallback } from 'react';
import { emitWebhook } from 'src/api/use-webhook-data.js';
import { matchAtom } from 'src/stores/state/index.js';

export const useMatchStartCallback = () => {
  const { canStartMatch, setState } = useMatchControl();
  const fieldControl = useSeasonFieldControl();
  const { events, connected } = useSocketWorker();
  return useAtomCallback(
    useCallback(
      (get) => {
        const match = get(matchAtom);
        if (!connected) {
          throw new Error('Not connected to realtime service.');
        }
        if (!canStartMatch) {
          throw new Error('Attempted to start match when not allowed.');
        }
        fieldControl?.startField?.();
        events.start();
        setState(MatchState.MATCH_IN_PROGRESS);
        emitWebhook(WebhookEvent.MATCH_STARTED, match);
      },
      [canStartMatch, setState]
    )
  );
};

export const useAbortMatchCallback = () => {
  const { canAbortMatch, setState } = useMatchControl();
  const abortModal = useModal(AbortDialog);
  const fieldControl = useSeasonFieldControl();
  const { events } = useSocketWorker();
  return async () => {
    if (!canAbortMatch) {
      throw new Error('Attempted to abort match when not allowed.');
    }
    const canAbort = await abortModal.show();
    if (!canAbort) return;
    fieldControl?.abortField?.();
    events.abort();
    setState(MatchState.PRESTART_READY);
  };
};
