import { Button } from 'antd';
import { FC, useState } from 'react';
import { useMatchControl } from '../hooks/use-match-control.js';
import {
  useCancelPrestartCallback,
  usePrestartCallback
} from '../hooks/use-prestart.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { ReplayDialog } from 'src/components/dialogs/replay-dialog.js';
import { useModal } from '@ebay/nice-modal-react';
import { RESULT_NOT_PLAYED } from '@toa-lib/models';
import { useAtomValue } from 'jotai';
import { matchAtom } from 'src/stores/state/event.js';

export const PrestartButton: FC = () => {
  const [loading, setLoading] = useState(false);
  const { canPrestart, canCancelPrestart } = useMatchControl();
  const { showSnackbar } = useSnackbar();
  const replayDialog = useModal(ReplayDialog);
  const match = useAtomValue<any>(matchAtom);
  const prestart = usePrestartCallback();
  const cancelPrestart = useCancelPrestartCallback();
  console.log({ canPrestart, canCancelPrestart });
  const sendPrestart = async () => {
    if (match?.result !== RESULT_NOT_PLAYED) {
      const doReplay = await replayDialog.show();
      if (!doReplay) {
        return;
      }
    }
    setLoading(true);
    try {
      await prestart();
      setLoading(false);
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while prestarting', error);
      setLoading(false);
    }
  };
  const sendCancelPrestart = async () => {
    try {
      await cancelPrestart();
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while cancelling prestart', error);
    }
  };
  return (
    <>
      {canPrestart ? (
        <Button
          type='primary'
          block
          onClick={sendPrestart}
          disabled={!canPrestart || loading}
          loading={loading}
          style={{ backgroundColor: '#faad14', borderColor: '#faad14' }}
        >
          Prestart
        </Button>
      ) : (
        <Button
          type='primary'
          danger
          block
          onClick={sendCancelPrestart}
          disabled={!canCancelPrestart}
        >
          Cancel Prestart
        </Button>
      )}
    </>
  );
};
