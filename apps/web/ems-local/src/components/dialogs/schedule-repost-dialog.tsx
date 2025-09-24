import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { create, useModal, muiDialogV5 } from '@ebay/nice-modal-react';

const ScheduleRepostDialog = create(() => {
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
        Schedule Matches
      </DialogTitle>
      <DialogContentText sx={{ padding: (theme) => theme.spacing(2) }}>
        <p>
          This tournament already has a schedule posted. Reposting the schedule
          will overwrite the existing schedule (including all matches,
          participants, and details).
        </p>
        <p>Are you sure you want to repost the schedule?</p>
      </DialogContentText>
      <DialogActions>
        <Button onClick={handleAbort} color='error'>
          Yes, Overwrite
        </Button>
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
});

export default ScheduleRepostDialog;
