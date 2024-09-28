import {
  EventSchedule,
  ScheduleItem,
  Tournament,
  Match
} from '@toa-lib/models';
import { FC } from 'react';

interface Props {
  eventSchedule?: EventSchedule;
  scheduleItems?: ScheduleItem[];
  tournament?: Tournament;
  onCreateMatches: (matches: Match<any>[]) => void;
}

export const FixedMatches: FC<Props> = () => {
  return <div>Fixed Matches</div>;
};
