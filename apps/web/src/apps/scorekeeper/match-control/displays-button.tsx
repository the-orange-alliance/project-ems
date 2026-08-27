import { Button } from 'antd';
import { FC, useState } from 'react';
import { useMatchControl } from '../hooks/use-match-control.js';
import { usePairedFieldGate } from '../hooks/use-paired-field-check.js';
import { MatchState, WebhookEvent } from '@toa-lib/models';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { matchAtom } from 'src/stores/state/index.js';
import { pairedFieldAtom } from 'src/stores/state/ui.js';
import { useAtomValue } from 'jotai';
import { emitWebhook } from 'src/api/use-webhook-data.js';
import { Displays } from '@toa-lib/models/base';
import { useModal } from '@ebay/nice-modal-react';
import { PairedFieldDialog } from 'src/components/dialogs/paired-field-dialog.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';

export const DisplaysButton: FC = () => {
  const [loading, setLoading] = useState(false);
  const { canSetDisplays, setState } = useMatchControl();
  const match = useAtomValue(matchAtom);
  const pairedField = useAtomValue(pairedFieldAtom);
  const { events } = useSocketWorker();
  const checkPairedFieldGate = usePairedFieldGate();
  const pairedFieldDialog = useModal(PairedFieldDialog);
  const { showSnackbar } = useSnackbar();

  const updateDisplays = async () => {
    setLoading(true);
    try {
      events.display(Displays.MATCH_START);
      emitWebhook(WebhookEvent.DISPLAYS_SET, match); // "match preview is set" — always happens

      if (pairedField && match) {
        const shouldBlock = await checkPairedFieldGate(match);
        if (shouldBlock) {
          const setActive = await pairedFieldDialog.show();
          if (!setActive) return; // Back Out: bail before going active below
        }
      }
      // Reached when: no paired field is set (current behavior, unchanged,
      // plus this webhook); a paired field is set but nothing to block on
      // (partner's previous match already played, or this is the first
      // match on that field); or a paired field blocked and the operator
      // picked "Set Field as Active".
      emitWebhook(WebhookEvent.PRODUCTION_ACTIVE, match);
      setState(MatchState.AUDIENCE_READY);
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while setting displays', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button
      type='primary'
      block
      onClick={updateDisplays}
      disabled={!canSetDisplays || loading}
      loading={loading}
      style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
    >
      Set Displays
    </Button>
  );
};
