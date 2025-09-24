import { ScheduleParams } from '@toa-lib/models';
import { FC } from 'react';
import { RoundRobinParticipants } from '../tournaments/round-robin.js';
import { DefaultScheduleParticipants } from '../tournaments/default.js';

interface Props {
  eventSchedule?: ScheduleParams;
  onEventScheduleChange?: (schedule: ScheduleParams) => void;
  disabled?: boolean;
}

export const ScheduleParticipants: FC<Props> = ({
  eventSchedule,
  onEventScheduleChange,
  disabled
}) => {
  if (!eventSchedule) return <div>Please select a tournament.</div>;
  switch (eventSchedule.type) {
    case 'Round Robin':
      return (
        <RoundRobinParticipants
          eventSchedule={eventSchedule}
          onEventScheduleChange={onEventScheduleChange}
          disabled={disabled}
        />
      );
    default:
      return (
        <DefaultScheduleParticipants
          eventSchedule={eventSchedule}
          onEventScheduleChange={onEventScheduleChange}
          disabled={disabled}
        />
      );
  }
};
