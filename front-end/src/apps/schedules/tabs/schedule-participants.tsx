import { Box, Button } from '@mui/material';
import { EventSchedule, Team } from '@toa-lib/models';
import { FC } from 'react';
import { useTeamsForEvent } from 'src/api/use-team-data';
import { PageLoader } from 'src/components/loading/PageLoader';
import { ParticipantTable } from 'src/components/tables/participant-table';
import { useSWRConfig } from 'swr';

interface Props {
  eventSchedule?: EventSchedule;
  disabled?: boolean;
}

export const ScheduleParticipants: FC<Props> = ({
  eventSchedule,
  disabled
}) => {
  const { mutate } = useSWRConfig();
  const { data: teams, isLoading } = useTeamsForEvent(eventSchedule?.eventKey);
  const canEdit = !disabled && eventSchedule;
  const toggleScheduledTeam = (t: Team) => {
    if (!eventSchedule) return;
    const isScheduled = eventSchedule.teams.find(
      (eventTeam) => t.teamKey === eventTeam.teamKey
    );
    mutate(
      `storage/${eventSchedule.eventKey}_${eventSchedule.tournamentKey}.json`,
      {
        ...eventSchedule,
        teams: isScheduled
          ? eventSchedule.teams.filter(
              (eventTeam) => eventTeam.teamKey !== t.teamKey
            )
          : [...eventSchedule.teams, t]
      }
    );
  };
  const toggleAll = () => {
    if (!eventSchedule) return;
    mutate(
      `storage/${eventSchedule.eventKey}_${eventSchedule.tournamentKey}.json`,
      {
        ...eventSchedule,
        teams: eventSchedule.teams.length > 0 ? [] : teams
      }
    );
  };
  return !isLoading ? (
    <Box>
      <Button
        sx={{ marginBottom: (theme) => theme.spacing(2) }}
        variant='contained'
        onClick={toggleAll}
        disabled={!canEdit}
      >
        Toggle All
      </Button>
      <ParticipantTable
        teams={teams ?? []}
        scheduledTeams={eventSchedule?.teams}
        disabled={!canEdit}
        onChange={toggleScheduledTeam}
      />
    </Box>
  ) : (
    <PageLoader />
  );
};
