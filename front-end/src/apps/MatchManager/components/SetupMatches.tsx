import { FC, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MatchMakerQuality from './MatchMakerQuality';
import { createMatchSchedule } from 'src/api/ApiProvider';
import { useRecoilCallback } from 'recoil';
import { eventAtom, tournamentScheduleSelector } from 'src/stores/Recoil';
import MatchTable from 'src/features/components/MatchTable/MatchTable';
import { Match } from '@toa-lib/models';

const SetupMatches: FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [quality, setQuality] = useState('best');

  const updateQuality = (quality: string) => setQuality(quality);

  const createMatches = useRecoilCallback(({ snapshot }) => async () => {
    const { eventKey, fieldCount: fields } = await snapshot.getPromise(
      eventAtom
    );
    const {
      matchesPerTeam,
      teamsParticipating,
      teamsPerAlliance,
      type,
      teams
    } = await snapshot.getPromise(tournamentScheduleSelector);
    const teamKeys = teams.map((t) => t.teamKey);
    const matches = await createMatchSchedule({
      eventKey,
      quality,
      fields,
      matchesPerTeam,
      teamsParticipating,
      teamsPerAlliance,
      type,
      teamKeys
    });
    setMatches(matches);
  });

  return (
    <Box>
      <MatchMakerQuality quality={quality} onChange={updateQuality} />
      <Button
        sx={{ display: 'block' }}
        variant='contained'
        onClick={createMatches}
      >
        Create Match Schedule
      </Button>
      <Divider />
      {matches.length > 0 && <MatchTable matches={matches} />}
    </Box>
  );
};

export default SetupMatches;
