import { FC, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MatchMakerQuality from './MatchMakerQuality';
import {
  createMatchSchedule,
  createRankings,
  postMatchSchedule
} from 'src/api/ApiProvider';
import { useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil';
import MatchTable from 'src/features/components/MatchTable/MatchTable';
import { CircularProgress } from '@mui/material';
import {
  currentEventSelector,
  currentScheduleByTournamentSelector,
  currentScheduleItemsByTournamentSelector,
  currentTournamentSelector,
  matchesByTournamentSelector
} from 'src/stores/NewRecoil';
import { assignMatchTimes } from '@toa-lib/models';
import { useSnackbar } from 'src/features/hooks/use-snackbar';

const SetupMatches: FC = () => {
  const tournament = useRecoilValue(currentTournamentSelector);
  const schedule = useRecoilValue(currentScheduleByTournamentSelector);
  const [matches, setMatches] = useRecoilState(matchesByTournamentSelector);

  const [quality, setQuality] = useState('best');
  const [loading, setLoading] = useState(false);

  const { showSnackbar } = useSnackbar();

  const updateQuality = (quality: string) => setQuality(quality);

  const createMatches = useRecoilCallback(({ snapshot }) => async () => {
    try {
      setLoading(true);
      const event = await snapshot.getPromise(currentEventSelector);
      const items = await snapshot.getPromise(
        currentScheduleItemsByTournamentSelector
      );
      if (!event || !tournament) return;
      const { eventKey } = event;
      const { tournamentKey, fieldCount: fields, name } = tournament;
      const teamKeys = schedule.teams.map((t) => t.teamKey);
      const matches = await createMatchSchedule({
        eventKey,
        tournamentKey: tournamentKey,
        quality,
        fields,
        matchesPerTeam: schedule.matchesPerTeam,
        teamsParticipating: schedule.teamsParticipating,
        teamsPerAlliance: schedule.teamsPerAlliance,
        teamKeys,
        name
      });
      setMatches(assignMatchTimes(matches, items));
      setLoading(false);
    } catch (e) {
      setLoading(false);
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while executing matchmaker.', error);
    }
  });

  const postMatches = async () => {
    if (!tournament) return;
    try {
      await createRankings(tournament.tournamentKey, schedule.teams);
      await postMatchSchedule(tournament.eventKey, matches);
      showSnackbar('Match schedule successfully posted');
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while uploading matches.', error);
    }
  };

  return (
    <Box>
      <MatchMakerQuality quality={quality} onChange={updateQuality} />
      <Button
        sx={{ display: 'block' }}
        variant='contained'
        onClick={createMatches}
        disabled={loading}
      >
        {loading ? <CircularProgress /> : <span>Create Match Schedule</span>}
      </Button>
      <Divider
        sx={{
          marginTop: (theme) => theme.spacing(2),
          marginBottom: (theme) => theme.spacing(2)
        }}
      />
      {matches.length > 0 && <MatchTable matches={matches} />}
      {matches.length > 0 && (
        <Button
          sx={{ marginTop: (theme) => theme.spacing(2) }}
          variant='contained'
          onClick={postMatches}
        >
          Post Schedule
        </Button>
      )}
    </Box>
  );
};

export default SetupMatches;
