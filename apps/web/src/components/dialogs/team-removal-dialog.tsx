import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { create, useModal, muiDialogV5 } from '@ebay/nice-modal-react';
import { Team } from '@toa-lib/models';

interface Props {
  team: Team;
}

export const TeamRemovalDialog = create(({ team }: Props) => {
  const modal = useModal();
  const handleClose = () => {
    modal.resolve(false);
    modal.hide();
  };
  const handleResolve = () => {
    modal.resolve(true);
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
        Team Removal
      </DialogTitle>
      <DialogContentText sx={{ padding: (theme) => theme.spacing(2) }}>
        Are you sure you want to remove <b>{team.teamNameLong}</b> from event
        registration?
      </DialogContentText>
      <DialogActions>
        <Button onClick={handleResolve}>Yes</Button>
        <Button onClick={handleClose}>No</Button>
      </DialogActions>
    </Dialog>
  );
});
