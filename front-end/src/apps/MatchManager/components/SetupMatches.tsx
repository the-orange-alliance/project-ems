import { FC, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MatchMakerQuality from './match/MatchMakerQuality';
import { createMatchSchedule, postMatchSchedule } from 'src/api/use-match-data';
import { createRankings } from 'src/api/use-ranking-data';
import { useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil';
import MatchTable from 'src/components/tables/MatchTable/MatchTable';
import { CircularProgress } from '@mui/material';
import {
  allianceMembersByTournamentSelector,
  currentEventSelector,
  currentScheduleByTournamentSelector,
  currentScheduleItemsByTournamentSelector,
  currentTournamentSelector,
  matchesByTournamentSelector,
  teamsByEventAtomFam
} from 'src/stores/NewRecoil';
import {
  FGCMatches,
  assignMatchTimes,
  createFixedMatches
} from '@toa-lib/models';
import { useSnackbar } from 'src/hooks/use-snackbar';
import MatchSchedulerDropdown from 'src/components/dropdowns/MatchSchedulerDropdown';

const SetupMatches: FC = () => {
  const schedule = useRecoilValue(currentScheduleByTournamentSelector);

  switch (schedule.type) {
    case 'Ranking':
      return <SetupRandomMatches />;
    case 'Round Robin':
      return <SetupFixedMatches />;
    default:
      return <SetupRandomMatches />;
  }
};

const SetupRandomMatches: FC = () => {
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
      {matches.length > 0 && (
        <MatchTable eventKey={tournament?.eventKey ?? ''} matches={matches} />
      )}
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

export const SetupFixedMatches: FC = () => {
  const [scheduler, setScheduler] = useState('standard');
  const [loading, setLoading] = useState(false);
  const tournament = useRecoilValue(currentTournamentSelector);
  const matches = useRecoilValue(matchesByTournamentSelector);

  const { showSnackbar } = useSnackbar();

  const createMatches = useRecoilCallback(({ snapshot, set }) => async () => {
    try {
      setLoading(true);
      const event = await snapshot.getPromise(currentEventSelector);
      const items = await snapshot.getPromise(
        currentScheduleItemsByTournamentSelector
      );
      const alliances = await snapshot.getPromise(
        allianceMembersByTournamentSelector
      );
      if (!event || !tournament) return;
      console.log(getAllianceMap());
      const matches = createFixedMatches(items, alliances, getAllianceMap());
      set(matchesByTournamentSelector, matches);
      setLoading(false);
    } catch (e) {
      setLoading(false);
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while executing matchmaker.', error);
    }
  });

  const postMatches = useRecoilCallback(({ snapshot }) => async () => {
    if (!tournament) return;
    try {
      const alliances = await snapshot.getPromise(
        allianceMembersByTournamentSelector
      );
      const teams = (
        await snapshot.getPromise(teamsByEventAtomFam(tournament.eventKey))
      ).filter((t) => alliances.find((a) => t.teamKey === a.teamKey));
      await createRankings(tournament.tournamentKey, teams);
      await postMatchSchedule(tournament.eventKey, matches);
      showSnackbar('Match schedule successfully posted');
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while uploading matches.', error);
    }
  });

  const getAllianceMap = () => {
    switch (scheduler) {
      case 'standard':
        return [];
      case 'fgc_2023':
        return FGCMatches.FGC2023.RoundRobinMap;
      case 'fgc_2023_2':
        return FGCMatches.FGC2023.FinalsMap;
      default:
        return [];
    }
  };

  return (
    <Box>
      <MatchSchedulerDropdown value={scheduler} onChange={setScheduler} />
      <Button
        sx={{ display: 'block', marginTop: '24px' }}
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
      {matches.length > 0 && (
        <MatchTable eventKey={tournament?.eventKey ?? ''} matches={matches} />
      )}
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
