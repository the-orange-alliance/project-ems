import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { create, useModal, muiDialogV5 } from '@ebay/nice-modal-react';

const AbortDialog = create(() => {
  const handleAbort = () => {
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
        Match Procedure
      </DialogTitle>
      <DialogContentText sx={{ padding: (theme) => theme.spacing(2) }}>
        <p>
          Aborting a match is a serious action which stops the match and
          interrupts event flow. This should only be done under serious
          circumstances or emergencies.
        </p>
        <p>Are you sure you want to abort the match?</p>
      </DialogContentText>
      <DialogActions>
        <Button onClick={handleAbort} color='error'>
          Abort
        </Button>
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
});

export default AbortDialog;
