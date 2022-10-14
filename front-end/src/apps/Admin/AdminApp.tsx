import { Box, Button, Divider, Paper, Typography } from '@mui/material';
import { clientFetcher } from '@toa-lib/client';
import { getTournamentLevelFromType } from '@toa-lib/models';
import { FC } from 'react';
import { useRecoilCallback } from 'recoil';
import {
  createRankings,
  purgeAll,
  recalculateRankings
} from 'src/api/ApiProvider';
import DefaultLayout from 'src/layouts/DefaultLayout';
import { useFlags } from 'src/stores/AppFlags';
import { selectedTournamentType, teamsAtom } from 'src/stores/Recoil';

const AdminApp: FC = () => {
  const [, , purgeFlags] = useFlags();

  const handlePurge = async (): Promise<void> => {
    try {
      await purgeAll();
      await purgeFlags();
    } catch (e) {
      console.log(e);
    }
  };

  const handleTest = useRecoilCallback(({ snapshot }) => async () => {
    const teams = await snapshot.getPromise(teamsAtom);
    const type = await snapshot.getPromise(selectedTournamentType);
    const tournamentLevel = getTournamentLevelFromType(type);
    await createRankings(tournamentLevel, teams);
  });

  const handleRankings = useRecoilCallback(({ snapshot }) => async () => {
    const type = await snapshot.getPromise(selectedTournamentType);
    const tournamentLevel = getTournamentLevelFromType(type);
    await recalculateRankings(tournamentLevel);
    await clientFetcher(`results/sync/rankings/${tournamentLevel}`, 'POST');
  });

  return (
    <DefaultLayout>
      <Paper>
        <Box sx={{ padding: (theme) => theme.spacing(2) }}>
          <Typography variant='h4'>Account Manager</Typography>
        </Box>
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
          <Button variant='contained' color='error' onClick={handleTest}>
            Create Rankings
          </Button>
          <Button variant='contained' color='error' onClick={handleRankings}>
            Re-Calculate Rankings
          </Button>
        </Box>
      </Paper>
    </DefaultLayout>
  );
};

export default AdminApp;
