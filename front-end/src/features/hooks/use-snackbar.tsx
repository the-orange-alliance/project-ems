import { FC } from 'react';
import Snackbar from '@mui/material/Snackbar';
import { useRecoilState } from 'recoil';
import { snackbarMessageAtom, snackbarOpenAtom } from 'src/stores/NewRecoil';

/**
 * The goal is to have the following
 * const { showSnackbar, Snackbar } = useSnackbar();
 */
interface UseSnackbarResult {
  showSnackbar: (msg: string) => void;
  AppSnackbar: FC;
}

type SnackbarHook = () => UseSnackbarResult;

export const useSnackbar: SnackbarHook = () => {
  const [open, setOpen] = useRecoilState(snackbarOpenAtom);
  const [message, setMessage] = useRecoilState(snackbarMessageAtom);

  const showSnackbar = (msg: string) => {
    setMessage(msg);
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const AppSnackbar = () => (
    <Snackbar
      open={open}
      autoHideDuration={5000}
      onClose={handleClose}
      message={message}
    />
  );

  return { showSnackbar, AppSnackbar };
};
