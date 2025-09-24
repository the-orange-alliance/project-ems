import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { create, useModal, muiDialogV5 } from '@ebay/nice-modal-react';

export const ReplayDialog = create(() => {
  const handleContinue = () => {
    modal.resolve(true);
    modal.hide();
  };
  const modal = useModal();
  const handleClose = () => {
    modal.resolve(false);
    modal.hide();
  };
  return (
    <Dialog {...muiDialogV5(modal)} onClose={handleClose}>
      <DialogTitle
        sx={{
          backgroundColor: (theme) => theme.palette.primary.main,
          color: (theme) => theme.palette.common.white,
          marginBottom: (theme) => theme.spacing(2)
        }}
      >
        Replay Match
      </DialogTitle>
      <DialogContentText sx={{ padding: (theme) => theme.spacing(2) }}>
        <p>
          It looks like this match has already been played.  By continuing, you will replay the match and overwrite the previous results, which is an irreversible action.
        </p>
        <p>Are you sure you want to replay the match?</p>
      </DialogContentText>
      <DialogActions>
        <Button onClick={handleContinue}>
          Yes, I want to replay the match
        </Button>
        <Button onClick={handleClose} color='error'>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
});
