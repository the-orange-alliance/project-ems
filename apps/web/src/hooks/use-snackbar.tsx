import { FC } from 'react';
import { Snackbar, Button } from '@mui/material';
import { useModal } from '@ebay/nice-modal-react';
import { ErrorDialog } from 'src/components/dialogs/error-dialog.js';
import { useAtom } from 'jotai';
import {
  isSnackbarOpenAtom,
  snackbarErrorMessageAtom,
  snackbarMessageAtom,
  isSnackbarDetailsShownAtom
} from 'src/stores/state/index.js';

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
    <Button color='info' onClick={handleClick}>
      Show
    </Button>
  );
};

export const useSnackbar: SnackbarHook = () => {
  const [open, setOpen] = useAtom(isSnackbarOpenAtom);
  const [message, setMessage] = useAtom(snackbarMessageAtom);
  const [useShow, setUseShow] = useAtom(isSnackbarDetailsShownAtom);
  const [error, setError] = useAtom(snackbarErrorMessageAtom);

  const showSnackbar = (msg: string, detail?: string) => {
    setMessage(msg);
    setUseShow(!!detail);
    setOpen(true);
    setError(detail ?? '');
  };

  const handleClose = () => setOpen(false);

  const AppSnackbar = () => (
    <Snackbar
      open={open}
      autoHideDuration={5000}
      onClose={handleClose}
      message={message}
      action={useShow ? <ModalButton message={error} /> : undefined}
    />
  );

  return { showSnackbar, AppSnackbar };
};
