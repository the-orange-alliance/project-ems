import { Box, Button, CircularProgress, Divider } from '@mui/material';
import { EventSchedule } from '@toa-lib/models';
import { FC, useState } from 'react';
import {
  createMatchSchedule,
  useAllMatchDataForTournament
} from 'src/api/use-match-data';
import { useTeamsForEvent } from 'src/api/use-team-data';
import { useCurrentTournament } from 'src/api/use-tournament-data';
import MatchMakerQuality from 'src/components/dropdowns/MatchMakerQuality';
import { MatchTable } from 'src/components/tables/matches-table';
import { useSnackbar } from 'src/hooks/use-snackbar';
import { useSWRConfig } from 'swr';

interface Props {
  eventSchedule?: EventSchedule;
  disabled?: boolean;
}

export const RandomMatches: FC<Props> = ({ eventSchedule, disabled }) => {
  const { mutate } = useSWRConfig();
  const matches = useAllMatchDataForTournament(
    eventSchedule?.eventKey,
    eventSchedule?.tournamentKey
  );
  const { data: teams } = useTeamsForEvent(eventSchedule?.eventKey);
  const tournament = useCurrentTournament();
  const [quality, setQuality] = useState('best');
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useSnackbar();
  const createMatches = async () => {
    setLoading(true);
    try {
      if (!eventSchedule) return;
      if (!tournament) return;
      const {
        eventKey,
        tournamentKey,
        matchesPerTeam,
        teamsParticipating,
        teamsPerAlliance
      } = eventSchedule;
      const { fieldCount: fields, name } = tournament;
      const teamKeys = eventSchedule.teams.map((t) => t.teamKey);
      const matches = await createMatchSchedule({
        eventKey,
        tournamentKey,
        quality,
        fields,
        matchesPerTeam,
        teamsParticipating,
        teamsPerAlliance,
        teamKeys,
        name
      });
      // TODO - How do we want to store this match data? Do we want to implement a new route to mutate properly?
      mutate(`match/${eventKey}/${tournamentKey}`, matches, {
        revalidate: false
      });
      showSnackbar('MatchMaker executed successfully.');
      setLoading(false);
    } catch (e) {
      setLoading(false);
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while executing matchmaker.', error);
    }
  };
  return (
    <Box>
      <MatchMakerQuality quality={quality} onChange={setQuality} />
      <Button
        sx={{ display: 'block' }}
        variant='contained'
        disabled={loading}
        onClick={createMatches}
      >
        {loading ? <CircularProgress /> : <span>Create Match Schedule</span>}
      </Button>
      <Divider
        sx={{
          marginTop: (theme) => theme.spacing(2),
          marginBottom: (theme) => theme.spacing(2)
        }}
      />
      {matches.length > 0 && <MatchTable matches={matches} teams={teams} />}
      {matches.length > 0 && (
        <Button
          sx={{ marginTop: (theme) => theme.spacing(2) }}
          variant='contained'
          disabled={disabled || loading}
        >
          Post Schedule
        </Button>
      )}
    </Box>
  );
};
