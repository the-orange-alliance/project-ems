import { FC } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { Box, Button, Divider, Typography } from '@mui/material';
import {
  createRankings,
  recalculateRankings,
  recalculatePlayoffsRankings
} from 'src/api/use-ranking-data';
import {
  resultsSyncMatches,
  resultsSyncRankings
} from 'src/api/use-results-sync';
import { purgeAll } from 'src/api/use-event-data';
import { useFlags } from 'src/stores/app-flags';
import {
  currentEventKeyAtom,
  currentTournamentKeyAtom
} from 'src/stores/recoil';
import { PaperLayout } from 'src/layouts/paper-layout';
import { TwoColumnHeader } from 'src/components/util/two-column-header';
import { EventTournamentsDropdown } from 'src/components/dropdowns/event-tournaments-dropdown';
import { Tournament } from '@toa-lib/models';
import { useTeamsForEvent } from 'src/api/use-team-data';
import { useTournamentsForEvent } from 'src/api/use-tournament-data';

export const AdminApp: FC = () => {
  const [tournamentKey, setTournamentKey] = useRecoilState(
    currentTournamentKeyAtom
  );
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const { data: teams } = useTeamsForEvent(eventKey);
  const { data: tournaments } = useTournamentsForEvent(eventKey);

  const [, , purgeFlags] = useFlags();

  const handleTournamentChange = (tournament: Tournament | null) => {
    if (!tournament) return;
    setTournamentKey(tournament.tournamentKey);
  };

  const syncMatches = async (): Promise<void> => {
    if (!tournamentKey) return;
    return resultsSyncMatches(eventKey, tournamentKey);
  };

  const syncRankings = async (): Promise<void> => {
    if (!tournamentKey) return;
    return resultsSyncRankings(eventKey, tournamentKey);
  };

  const handlePurge = async (): Promise<void> => {
    try {
      await purgeAll();
      await purgeFlags();
    } catch (e) {
      console.log(e);
    }
  };

  const handleRankingsCreate = async () => {
    if (!tournamentKey || !teams) return;
    await createRankings(tournamentKey, teams);
  };

  const handleRankings = async () => {
    if (!tournamentKey || !tournaments) return;
    const tournament = tournaments.find(
      (t) => t.tournamentKey === tournamentKey
    );
    if (!tournament) return;
    // FGC2023 SPECIFIC
    if (tournamentKey === '2' || tournamentKey === '3') {
      await recalculatePlayoffsRankings(
        tournament.eventKey,
        tournament.tournamentKey
      );
    } else {
      await recalculateRankings(tournament.eventKey, tournament.tournamentKey);
    }
  };

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
        <Button variant='contained' color='error' onClick={syncMatches}>
          Sync Matches
        </Button>
        <Button variant='contained' color='error' onClick={syncRankings}>
          Sync Rankings
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
        <Button variant='contained' color='error' onClick={handlePurge}>
          Purge Event Data
        </Button>
      </Box>
    </PaperLayout>
  );
};
