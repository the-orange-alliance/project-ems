import { EventSchedule } from '@toa-lib/models';
import { FC } from 'react';
import { RoundRobinParticipants } from '../tournaments/round-robin';
import { DefaultScheduleParticipants } from '../tournaments/default';

interface Props {
  eventSchedule?: EventSchedule;
  disabled?: boolean;
}

export const ScheduleParticipants: FC<Props> = ({
  eventSchedule,
  disabled
}) => {
  if (!eventSchedule) return <div>Please select a tournament.</div>;
  switch (eventSchedule.type) {
    case 'Round Robin':
      return (
        <RoundRobinParticipants
          eventSchedule={eventSchedule}
          disabled={disabled}
        />
      );
    default:
      return (
        <DefaultScheduleParticipants
          eventSchedule={eventSchedule}
          disabled={disabled}
        />
      );
  }
};
