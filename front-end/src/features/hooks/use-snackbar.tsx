import { FC } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Button from '@mui/material/Button';
import { useRecoilState } from 'recoil';
import {
  snackbarErrorAtom,
  snackbarMessageAtom,
  snackbarOpenAtom,
  snackbarUseShowAtom
} from 'src/stores/NewRecoil';
import { useModal } from '@ebay/nice-modal-react';
import ErrorDialog from 'src/components/Dialogs/ErrorDialog';

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
  const [open, setOpen] = useRecoilState(snackbarOpenAtom);
  const [message, setMessage] = useRecoilState(snackbarMessageAtom);
  const [useShow, setUseShow] = useRecoilState(snackbarUseShowAtom);
  const [error, setError] = useRecoilState(snackbarErrorAtom);

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
