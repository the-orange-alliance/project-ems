import { ChangeEvent, FC, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField
} from '@mui/material';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import {
  eventKeySelector,
  selectedTeamAtom,
  teamDialogOpen,
  teamsAtom
} from 'src/stores/Recoil';
import { defaultTeam, Team } from '@toa-lib/models';

const TeamDialog: FC = () => {
  const [team, setTeam] = useState<Team>(defaultTeam);

  const [selectedTeam, setSelectedTeam] = useRecoilState(selectedTeamAtom);
  const [open, setOpen] = useRecoilState(teamDialogOpen);
  const setTeams = useSetRecoilState(teamsAtom);
  const eventKey = useRecoilValue(eventKeySelector);

  const editMode = selectedTeam !== null;

  useEffect(() => {
    if (!selectedTeam && open) {
      setTeam({
        ...team,
        eventParticipantKey: `${eventKey}-${team.teamKey}`
      });
    }
  }, [open, selectedTeam]);

  useEffect(() => {
    setTeam({
      ...team,
      eventParticipantKey: `${eventKey}-${team.teamKey}`
    });
  }, [team.teamKey]);

  useEffect(() => {
    if (selectedTeam) setTeam(selectedTeam);
  }, [selectedTeam]);

  useEffect(() => {
    if (!open) setTeam(defaultTeam);
  }, [open]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (event.target.type === 'number') {
      setTeam({ ...team, [event.target.name]: parseInt(event.target.value) });
    } else {
      setTeam({ ...team, [event.target.name]: event.target.value });
    }
  };

  const handleModify = (): void => {
    setTeams((prev) => [
      ...prev.filter((t) => t.teamKey !== team.teamKey),
      team
    ]);
    setOpen(false);
  };

  const handleCreate = (): void => {
    setTeams((prev) => [team, ...prev]);
    setOpen(false);
  };

  const handleClose = (): void => {
    setSelectedTeam(null);
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
        Team
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          name='teamKey'
          label='Team Key'
          variant='standard'
          type='number'
          value={team?.teamKey}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          name='teamNameShort'
          label='Team Name (Short)'
          variant='standard'
          value={team?.teamNameShort}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          name='teamNameLong'
          label='Team Name (Long)'
          variant='standard'
          value={team?.teamNameLong}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          name='robotName'
          label='Robot Name'
          variant='standard'
          value={team?.robotName}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          name='city'
          label='City'
          variant='standard'
          value={team?.city}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          name='stateProv'
          label='State/Province'
          variant='standard'
          value={team?.stateProv}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          name='country'
          label='Country'
          variant='standard'
          value={team?.country}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          name='countryCode'
          label='Country Code'
          variant='standard'
          value={team?.countryCode}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          name='rookieYear'
          label='Rookie Year'
          variant='standard'
          type='number'
          value={team?.rookieYear}
          onChange={handleChange}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {editMode && <Button onClick={handleModify}>Modify</Button>}
        {!editMode && <Button onClick={handleCreate}>Create</Button>}
      </DialogActions>
    </Dialog>
  );
};

export default TeamDialog;
