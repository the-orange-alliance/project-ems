import { FC, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MatchMakerQuality from './MatchMakerQuality';
import { createMatchSchedule } from 'src/api/ApiProvider';
import { useRecoilCallback } from 'recoil';
import { eventAtom, tournamentScheduleSelector } from 'src/stores/Recoil';

const SetupMatches: FC = () => {
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
    await createMatchSchedule({
      eventKey,
      quality,
      fields,
      matchesPerTeam,
      teamsParticipating,
      teamsPerAlliance,
      type,
      teamKeys
    });
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
    </Box>
  );
};

export default SetupMatches;
