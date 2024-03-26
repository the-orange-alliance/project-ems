import { Box, Button, CircularProgress, Divider } from '@mui/material';
import {
  EventSchedule,
  Match,
  ScheduleItem,
  Tournament,
  assignMatchTimes
} from '@toa-lib/models';
import { FC, useState } from 'react';
import { createMatchSchedule } from 'src/api/use-match-data';
import MatchMakerQuality from 'src/components/dropdowns/MatchMakerQuality';
import { useSnackbar } from 'src/hooks/use-snackbar';

interface Props {
  eventSchedule?: EventSchedule;
  scheduleItems?: ScheduleItem[];
  tournament?: Tournament;
  onCreateMatches: (matches: Match<any>[]) => void;
}

export const RandomMatches: FC<Props> = ({
  eventSchedule,
  scheduleItems,
  tournament,
  onCreateMatches
}) => {
  const [quality, setQuality] = useState('best');
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useSnackbar();
  const createMatches = async () => {
    setLoading(true);
    try {
      if (!eventSchedule) return;
      if (!tournament) return;
      if (!scheduleItems) return;
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
      onCreateMatches(assignMatchTimes(matches, scheduleItems));
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
        sx={{ marginTop: (theme) => theme.spacing(2), display: 'block' }}
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
    </Box>
  );
};
