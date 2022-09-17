import { FC } from 'react';
import Box from '@mui/material/Box';
import TeamSelectionTable from './TeamSelectionTable';
import { Button } from '@mui/material';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import {
  selectedTournamentType,
  teamsAtom,
  teamsInScheduleSelectorFamily
} from 'src/stores/Recoil';

const SetupTeams: FC = () => {
  const tournamentType = useRecoilValue(selectedTournamentType);
  const eventTeams = useRecoilValue(teamsAtom);
  const setScheduledTeams = useSetRecoilState(
    teamsInScheduleSelectorFamily(tournamentType)
  );

  const toggleAll = () =>
    setScheduledTeams((prev) => (prev.length > 0 ? [] : eventTeams));

  return (
    <Box>
      <Box sx={{ marginBottom: (theme) => theme.spacing(2) }}>
        <Button variant='contained' onClick={toggleAll}>
          Toggle Select All
        </Button>
      </Box>
      <TeamSelectionTable />
    </Box>
  );
};

export default SetupTeams;
