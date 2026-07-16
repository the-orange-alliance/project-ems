import { FC } from 'react';
import { notification, Button } from 'antd';
import { useModal } from '@ebay/nice-modal-react';
import { ErrorDialog } from 'src/components/dialogs/error-dialog.js';

/**
 * The goal is to have the following
 * const { showSnackbar, Snackbar } = useSnackbar();
 */
interface UseSnackbarResult {
  showSnackbar: (msg: string, errorDetail?: string) => void;
  AppSnackbar: FC;
}

type SnackbarHook = () => UseSnackbarResult;

const ModalButton: FC<{ message: string }> = ({ message }) => {
  const errorDialog = useModal(ErrorDialog);
  const handleClick = () => errorDialog.show({ message });
  return (
    <Button type='link' size='small' onClick={handleClick}>
      Show
    </Button>
  );
};

export const useSnackbar: SnackbarHook = () => {
  const showSnackbar = (msg: string, detail?: string) => {
    notification.open({
      message: msg,
      duration: 5,
      btn: detail ? <ModalButton message={detail} /> : undefined
    });
  };

  // antd's notification renders via its own portal, so there's nothing to mount here.
  const AppSnackbar: FC = () => null;

  return { showSnackbar, AppSnackbar };
};
