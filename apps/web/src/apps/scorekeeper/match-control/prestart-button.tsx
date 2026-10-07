import { Button } from 'antd';
import { CloseCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
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
  const { showErrorSnackbar } = useSnackbar();
  const replayDialog = useModal(ReplayDialog);
  const match = useAtomValue<any>(matchAtom);
  const prestart = usePrestartCallback();
  const cancelPrestart = useCancelPrestartCallback();
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
      showErrorSnackbar('Error while prestarting.', e);
      setLoading(false);
    }
  };
  const sendCancelPrestart = async () => {
    try {
      await cancelPrestart();
    } catch (e) {
      showErrorSnackbar('Error while cancelling prestart.', e);
    }
  };
  return (
    <>
      {canPrestart ? (
        <Button
          color='orange'
          variant='solid'
          size='large'
          block
          icon={<ThunderboltOutlined />}
          onClick={sendPrestart}
          disabled={!canPrestart || loading}
          loading={loading}
        >
          Prestart
        </Button>
      ) : (
        <Button
          type='primary'
          danger
          size='large'
          block
          icon={<CloseCircleOutlined />}
          onClick={sendCancelPrestart}
          disabled={!canCancelPrestart}
        >
          Cancel Prestart
        </Button>
      )}
    </>
  );
};
