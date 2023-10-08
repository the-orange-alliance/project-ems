import { FC } from 'react';
import Box from '@mui/material/Box';
import TeamSelectionTable from './TeamSelectionTable';
import { Button } from '@mui/material';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import {
  currentEventKeyAtom,
  currentScheduledTeamsSelector,
  teamsByEventAtomFam
} from 'src/stores/NewRecoil';

const SetupTeams: FC = () => {
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const eventTeams = useRecoilValue(teamsByEventAtomFam(eventKey));
  const setScheduledTeams = useSetRecoilState(currentScheduledTeamsSelector);

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
