import { FC } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import { useRecoilState, useSetRecoilState } from 'recoil';
import {
  selectedTeamAtom,
  teamRemoveDialogOpen,
  teamsAtom
} from 'src/stores/Recoil';

const TeamDialog: FC = () => {
  const setTeams = useSetRecoilState(teamsAtom);
  const [team, setTeam] = useRecoilState(selectedTeamAtom);
  const [open, setOpen] = useRecoilState(teamRemoveDialogOpen);

  const handleRemove = async (): Promise<void> => {
    if (team) {
      setTeams((prev) => prev.filter((t) => t.teamKey !== team.teamKey));
    }
    setOpen(false);
  };

  const handleClose = (): void => {
    setTeam(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='xs'>
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
        Are you sure you want to remove <b>{team?.teamNameLong}</b> from event
        registration?
      </DialogContentText>
      <DialogActions>
        <Button onClick={handleRemove}>Yes</Button>
        <Button onClick={handleClose}>No</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TeamDialog;
