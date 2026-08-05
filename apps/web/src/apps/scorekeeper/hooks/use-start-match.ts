import { useMatchControl } from './use-match-control.js';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { MatchState, WebhookEvent } from '@toa-lib/models';
import { useSeasonFieldControl } from 'src/hooks/use-season-components.js';
import { useModal } from '@ebay/nice-modal-react';
import { AbortDialog } from 'src/components/dialogs/abort-dialog.js';
import { useAtomCallback } from 'jotai/utils';
import { useCallback } from 'react';
import { DateTime } from 'luxon';
import { emitWebhook } from 'src/api/use-webhook-data.js';
import { patchMatch } from 'src/api/use-match-data.js';
import { matchAtom } from 'src/stores/state/index.js';

export const useMatchStartCallback = () => {
  const { canStartMatch, setState } = useMatchControl();
  const fieldControl = useSeasonFieldControl();
  const { events, connected } = useSocketWorker();
  return useAtomCallback(
    useCallback(
      async (get, set) => {
        const match = get(matchAtom);
        if (!connected) {
          throw new Error('Not connected to realtime service.');
        }
        if (!canStartMatch) {
          throw new Error('Attempted to start match when not allowed.');
        }
        if (!match) {
          throw new Error('Attempted to start match without a match selected.');
        }
        // Start the field and the timer first — neither should wait on a
        // network round trip. Everything below is bookkeeping.
        fieldControl?.startField?.();
        events.start();
        setState(MatchState.MATCH_IN_PROGRESS);

        const currentMatch = {
          ...match,
          actualStartTime: DateTime.now().toISO() ?? ''
        };
        set(matchAtom, currentMatch);
        try {
          await patchMatch(currentMatch);
        } catch (e) {
          // Deliberately not rethrown: the match is already running, and
          // surfacing a blocking error mid-match would be alarming and
          // unactionable. The start time can be corrected in the match editor.
          console.error('Failed to persist match start time', e);
        }
        emitWebhook(WebhookEvent.MATCH_STARTED, currentMatch);
      },
      [canStartMatch, setState, connected, fieldControl, events]
    )
  );
};

export const useAbortMatchCallback = () => {
  const { canAbortMatch, setState } = useMatchControl();
  const abortModal = useModal(AbortDialog);
  const fieldControl = useSeasonFieldControl();
  const { events } = useSocketWorker();
  return useAtomCallback(
    useCallback(
      async (get) => {
        if (!canAbortMatch) {
          throw new Error('Attempted to abort match when not allowed.');
        }
        const canAbort = await abortModal.show();
        if (!canAbort) return;
        const match = get(matchAtom);
        fieldControl?.abortField?.();
        events.abort();
        setState(MatchState.PRESTART_READY);
        // Aborting returns the field to PRESTART_READY, so from a subscriber's
        // point of view the prestart has been undone — same as cancelling it.
        if (match) emitWebhook(WebhookEvent.PRESTART_ABORTED, match);
      },
      [canAbortMatch, setState, fieldControl, events, abortModal]
    )
  );
};
