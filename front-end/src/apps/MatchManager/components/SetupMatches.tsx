import { FC, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MatchMakerQuality from './MatchMakerQuality';
import { createMatchSchedule, postMatchSchedule } from 'src/api/ApiProvider';
import { useRecoilCallback, useRecoilValue, useSetRecoilState } from 'recoil';
import {
  eventAtom,
  matches,
  matchesByTournamentType,
  selectedTournamentType,
  tournamentScheduleItemAtomFamily,
  tournamentScheduleSelector
} from 'src/stores/Recoil';
import MatchTable from 'src/features/components/MatchTable/MatchTable';
import { assignMatchFieldsForFGC } from '@toa-lib/models';
import { CircularProgress } from '@mui/material';

const SetupMatches: FC = () => {
  const type = useRecoilValue(selectedTournamentType);
  const typeMatches = useRecoilValue(matchesByTournamentType(type));
  const setMatches = useSetRecoilState(matches);

  const [quality, setQuality] = useState('best');
  const [loading, setLoading] = useState(false);

  const updateQuality = (quality: string) => setQuality(quality);

  const createMatches = useRecoilCallback(({ snapshot }) => async () => {
    setLoading(true);
    const { eventKey, fieldCount: fields } = await snapshot.getPromise(
      eventAtom
    );
    const schedule = await snapshot.getPromise(tournamentScheduleSelector);
    const teamKeys = schedule.teams.map((t) => t.teamKey);
    const items = await snapshot.getPromise(
      tournamentScheduleItemAtomFamily(schedule.type)
    );
    const newMatches = await createMatchSchedule({
      eventKey,
      quality,
      fields,
      matchesPerTeam: schedule.matchesPerTeam,
      teamsParticipating: schedule.teamsParticipating,
      teamsPerAlliance: schedule.teamsPerAlliance,
      type,
      teamKeys
    });
    const fgcMatches = assignMatchFieldsForFGC(newMatches, items, schedule);
    setMatches((prev) => [...prev, ...fgcMatches]);
    setLoading(false);
  });

  const postMatches = async () => {
    await postMatchSchedule(typeMatches);
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
      {typeMatches.length > 0 && <MatchTable matches={typeMatches} />}
      {typeMatches.length > 0 && (
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
