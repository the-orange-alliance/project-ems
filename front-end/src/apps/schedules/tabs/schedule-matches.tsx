import { FC } from 'react';
import { RandomMatches } from '../match-gen/random-matches';
import { EventSchedule } from '@toa-lib/models';

interface Props {
  eventSchedule?: EventSchedule;
  disabled?: boolean;
}

export const ScheduleMatches: FC<Props> = ({ eventSchedule, disabled }) => {
  return (
    <>
      <RandomMatches eventSchedule={eventSchedule} disabled={disabled} />
    </>
  );
};
