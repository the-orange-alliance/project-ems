import { FC } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PaperLayout from '@layouts/PaperLayout';
import Tournaments from './components/Tournaments';
import TournamentForm from 'src/components/forms/TournamentForm/TournamentForm';
import { useRecoilState, useSetRecoilState } from 'recoil';
import {
  currentTournamentKeyAtom,
  currentTournamentSelector
} from 'src/stores/NewRecoil';
import { Tournament } from '@toa-lib/models';

const TournamentManager: FC = () => {
  const [tournamentKey, setTournamentKey] = useRecoilState(
    currentTournamentKeyAtom
  );
  const setTournament = useSetRecoilState(currentTournamentSelector);

  const handleSubmit = (tournament: Tournament) => {
    setTournament(tournament);
    setTournamentKey(null);
  };

  return (
    <PaperLayout
      containerWidth='xl'
      header={<Typography variant='h4'>Tournament Manager</Typography>}
      padding
    >
      <Box sx={{ marginBottom: (theme) => theme.spacing(2) }}>
        {!tournamentKey && <Tournaments />}
        {tournamentKey && <TournamentForm onSubmit={handleSubmit} />}
      </Box>
    </PaperLayout>
  );
};

export default TournamentManager;
