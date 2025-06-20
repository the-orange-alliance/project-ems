import { Button } from 'antd';
import { ScheduleParams, Team } from '@toa-lib/models';
import { FC } from 'react';
import { useTeamsForEvent } from 'src/api/use-team-data.js';
import { PageLoader } from 'src/components/loading/page-loader.js';
import { ParticipantTable } from 'src/components/tables/participant-table.js';

interface Props {
  eventSchedule: ScheduleParams;
  onEventScheduleChange?: (eventSchedule: ScheduleParams) => void;
  disabled?: boolean;
}

export const DefaultScheduleParticipants: FC<Props> = ({
  eventSchedule,
  onEventScheduleChange,
  disabled
}) => {
  const { data: teams, isLoading } = useTeamsForEvent(eventSchedule.eventKey);
  const canEdit = !disabled && eventSchedule;
  const toggleScheduledTeam = (t: Team) => {
    if (!teams) return;
    const isScheduled = eventSchedule.teamKeys.includes(t.teamKey);
    const newTeams = isScheduled
      ? eventSchedule.teamKeys.filter((eventTeam) => eventTeam !== t.teamKey)
      : [...eventSchedule.teamKeys, t.teamKey];
    onEventScheduleChange?.({
      ...eventSchedule,
      teamKeys: newTeams
    });
  };
  const toggleAll = () => {
    if (!teams) return;
    const newTeams = teams.map((t) => t.teamKey);
    const toggleOn = eventSchedule.teamKeys.length < teams.length;
    onEventScheduleChange?.({
      ...eventSchedule,
      teamKeys: toggleOn ? newTeams : []
    });
  };
  return !isLoading ? (
    <div>
      <Button
        style={{ marginBottom: 16 }}
        type='primary'
        onClick={toggleAll}
        disabled={!canEdit}
      >
        Toggle All
      </Button>
      <ParticipantTable
        teams={teams ?? []}
        scheduledTeams={eventSchedule.teamKeys}
        disabled={!canEdit}
        onChange={toggleScheduledTeam}
      />
    </div>
  ) : (
    <PageLoader />
  );
};
