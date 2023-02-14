import { FC, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import UpgradedTable from '@components/UpgradedTable/UpgradedTable';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import {
  currentEventSelector,
  currentTournamentKeyAtom,
  tournamentsByEventAtomFam
} from 'src/stores/NewRecoil';

import AddIcon from '@mui/icons-material/Add';

const Tournaments: FC = () => {
  // Recoil State
  const event = useRecoilValue(currentEventSelector);
  const [tournaments, setTournaments] = useRecoilState(
    tournamentsByEventAtomFam(event?.eventKey ?? '')
  );
  const setTournamentKey = useSetRecoilState(currentTournamentKeyAtom);

  // Local State
  const [loading, setLoading] = useState(false);

  if (!event) return null;

  return (
    <>
      <Box
        sx={{
          marginBottom: (theme) => theme.spacing(3),
          display: 'flex',
          justifyContent: 'flex-end',
          gap: (theme) => theme.spacing(2)
        }}
      >
        <LoadingButton
          loading={loading}
          variant='contained'
          disabled={tournaments.length <= 0}
        >
          Upload Tournaments
        </LoadingButton>
        <Button variant='contained' sx={{ paddinG: '6px', minWidth: '24px' }}>
          <AddIcon />
        </Button>
      </Box>
      <UpgradedTable
        data={tournaments}
        headers={['Event', 'Tournament ID', 'Name', 'Tournament', 'Fields']}
        renderRow={(t) => {
          const { eventName } = event;
          return [
            eventName,
            t.tournamentKey,
            t.name,
            t.tournamentLevel,
            t.fields
          ];
        }}
      />
    </>
  );
};

export default Tournaments;
