import { FC } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField
} from '@mui/material';
import { Team } from '@toa-lib/models';

interface Props {
  open: boolean;
  team?: Team;
  onClose: () => void;
  onSubmit: () => void;
}

const TeamDialog: FC<Props> = ({ open, team, onClose, onSubmit }) => {
  const editMode = typeof team !== 'undefined';

  return (
    <Dialog open={open} onClose={onClose} maxWidth='xs'>
      <DialogTitle
        sx={{
          backgroundColor: (theme) => theme.palette.primary.main,
          color: (theme) => theme.palette.common.white,
          marginBottom: (theme) => theme.spacing(2)
        }}
      >
        Team
      </DialogTitle>
      <DialogContent>
        {/* TODO - Create all text fields to modify team */}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {editMode && <Button onClick={submit}>Modify</Button>}
        {!editMode && <Button onClick={submit}>Create</Button>}
      </DialogActions>
    </Dialog>
  );
};

export default TeamDialog;
