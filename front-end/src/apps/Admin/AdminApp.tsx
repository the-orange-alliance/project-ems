import { FC } from 'react';
import { useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil';
import { Box, Button, Divider, Typography } from '@mui/material';
import {
  createRankings,
  purgeAll,
  recalculateRankings
} from 'src/api/ApiProvider';
import { useFlags } from 'src/stores/AppFlags';
import {
  currentEventKeySelector,
  currentTeamsByEventSelector,
  currentTournamentKeyAtom,
  currentTournamentSelector
} from 'src/stores/NewRecoil';
import PaperLayout from 'src/layouts/PaperLayout';
import TwoColumnHeader from 'src/components/Headers/TwoColumnHeader';
import EventTournamentsDropdown from 'src/components/Dropdowns/EventTournamentsDropdown';
import { Tournament } from '@toa-lib/models';

const AdminApp: FC = () => {
  const [tournamentKey, setTournamentKey] = useRecoilState(
    currentTournamentKeyAtom
  );
  const eventKey = useRecoilValue(currentEventKeySelector);

  const [, , purgeFlags] = useFlags();

  const handleTournamentChange = (tournament: Tournament | null) => {
    if (!tournament) return;
    setTournamentKey(tournament.tournamentKey);
  };

  const handlePurge = async (): Promise<void> => {
    try {
      await purgeAll();
      await purgeFlags();
    } catch (e) {
      console.log(e);
    }
  };

  const handleRankingsCreate = useRecoilCallback(({ snapshot }) => async () => {
    const teams = await snapshot.getPromise(currentTeamsByEventSelector);
    const tournamentKey = await snapshot.getPromise(currentTournamentKeyAtom);
    if (!tournamentKey) return;
    await createRankings(tournamentKey, teams);
  });

  const handleRankings = useRecoilCallback(({ snapshot }) => async () => {
    const tournament = await snapshot.getPromise(currentTournamentSelector);
    if (!tournament) return;
    await recalculateRankings(tournament.eventKey, tournament.tournamentKey);
  });

  return (
    <PaperLayout
      header={
        <TwoColumnHeader
          left={<Typography variant='h4'>Admin App</Typography>}
          right={
            <EventTournamentsDropdown
              eventKey={eventKey}
              value={tournamentKey}
              onChange={handleTournamentChange}
            />
          }
        />
      }
    >
      <Divider />
      <Box
        sx={{
          padding: (theme) => theme.spacing(2),
          display: 'flex',
          gap: '16px'
        }}
      >
        <Button variant='contained' color='error' onClick={handlePurge}>
          Purge Event Data
        </Button>
        <Button
          variant='contained'
          color='error'
          onClick={handleRankingsCreate}
        >
          Create Rankings
        </Button>
        <Button variant='contained' color='error' onClick={handleRankings}>
          Re-Calculate Rankings
        </Button>
      </Box>
    </PaperLayout>
  );
};

export default AdminApp;
