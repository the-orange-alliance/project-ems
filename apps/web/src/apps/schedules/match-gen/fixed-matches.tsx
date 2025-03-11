import { Box, Button } from '@mui/material';
import {
  EventSchedule,
  ScheduleItem,
  Tournament,
  Match,
  createFixedMatches,
  assignMatchTimes,
  FGCMatches
} from '@toa-lib/models';
import { FC, useState } from 'react';
import { useAllianceMembers } from 'src/api/use-alliance-data';
import { MatchSchedulerDropdown } from 'src/components/dropdowns/match-scheduler-dropdown';

interface Props {
  eventSchedule?: EventSchedule;
  scheduleItems?: ScheduleItem[];
  tournament?: Tournament;
  onCreateMatches: (matches: Match<any>[]) => void;
}

export const FixedMatches: FC<Props> = ({
  eventSchedule,
  scheduleItems,
  onCreateMatches
}) => {
  const { data: alliances } = useAllianceMembers(
    eventSchedule?.eventKey,
    eventSchedule?.tournamentKey
  );
  const [gen, setGen] = useState('standard');
  const createMatches = () => {
    if (!scheduleItems || !alliances) return;
    const map =
      gen === 'fgc_2023'
        ? FGCMatches.FGC2023.RoundRobinMap
        : FGCMatches.FGC2023.FinalsMap;
    const matches = createFixedMatches(scheduleItems, alliances, map);
    onCreateMatches(assignMatchTimes(matches, scheduleItems));
  };
  return (
    <Box>
      <MatchSchedulerDropdown onChange={setGen} value={gen} />
      <Button
        sx={{ marginTop: (theme) => theme.spacing(2), display: 'block' }}
        variant='contained'
        onClick={createMatches}
      >
        Create Match Schedule
      </Button>
    </Box>
  );
};
