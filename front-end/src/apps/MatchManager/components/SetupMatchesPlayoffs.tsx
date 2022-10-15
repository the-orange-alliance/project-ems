import { FC } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import { useRecoilCallback, useRecoilValue, useSetRecoilState } from 'recoil';
import {
  allinaceMembers,
  eventKeySelector,
  matches,
  matchesByTournamentType,
  selectedTournamentLevel,
  selectedTournamentType,
  tournamentScheduleAtomFamily,
  tournamentScheduleItemAtomFamily
} from 'src/stores/Recoil';
import MatchTable from 'src/features/components/MatchTable/MatchTable';
import { createFixedMatches } from '@toa-lib/models';
import { postMatchSchedule, postRankings } from 'src/api/ApiProvider';

const RoundRobinMap = [
  [4, 7],
  [5, 6],
  [3, 8],
  [1, 2],
  [5, 4],
  [3, 6],
  [2, 7],
  [1, 8],
  [3, 4],
  [2, 5],
  [1, 6],
  [7, 8],
  [2, 3],
  [1, 4],
  [5, 8],
  [6, 7]
];
const FinalsMap = [
  [1, 3],
  [3, 2],
  [2, 1]
];

const SetupMatchesPlayoffs: FC = () => {
  const type = useRecoilValue(selectedTournamentType);
  const level = useRecoilValue(selectedTournamentLevel);
  const typeMatches = useRecoilValue(matchesByTournamentType(type));
  const schedule = useRecoilValue(tournamentScheduleAtomFamily(type));
  const setMatches = useSetRecoilState(matches);

  const createMatches = useRecoilCallback(({ snapshot }) => async () => {
    const eventKey = await snapshot.getPromise(eventKeySelector);
    const items = await snapshot.getPromise(
      tournamentScheduleItemAtomFamily(schedule.type)
    );
    const members = await (
      await snapshot.getPromise(allinaceMembers)
    ).filter((a) => a.tournamentLevel === level);
    const newMatches =
      type === 'Round Robin'
        ? createFixedMatches(items, members, RoundRobinMap, eventKey)
        : createFixedMatches(items, members, FinalsMap, eventKey);
    setMatches((prev) => [...prev, ...newMatches]);
  });

  const postMatches = useRecoilCallback(({ snapshot }) => async () => {
    const eventKey = await snapshot.getPromise(eventKeySelector);
    const members = await (
      await snapshot.getPromise(allinaceMembers)
    ).filter((a) => a.tournamentLevel === level);
    await postRankings(
      members.map((m) => ({
        allianceKey: m.allianceKey,
        rankKey: `${eventKey}-${level}-${m.teamKey}`,
        tournamentLevel: level,
        rank: m.allianceRank,
        losses: 0,
        played: 0,
        rankChange: 0,
        ties: 0,
        wins: 0,
        teamKey: m.teamKey
      }))
    );
    await postMatchSchedule(typeMatches);
  });

  return (
    <Box>
      <Button
        sx={{ display: 'block' }}
        variant='contained'
        onClick={createMatches}
      >
        Create Playoffs Matches
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

export default SetupMatchesPlayoffs;
