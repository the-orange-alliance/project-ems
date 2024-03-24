import { FC } from 'react';
import { ScheduleFooter } from '../schedule-footer';
import { DefaultScheduleOptions } from '../options/default-options';
import { EventSchedule } from '@toa-lib/models';
import { PageLoader } from 'src/components/loading/PageLoader';

interface Props {
  eventSchedule?: EventSchedule;
  disabled?: boolean;
}

export const ScheduleParams: FC<Props> = ({ eventSchedule, disabled }) => {
  return eventSchedule ? (
    <>
      <DefaultScheduleOptions
        eventSchedule={eventSchedule}
        onChange={() => console.log('change')}
      />
      <ScheduleFooter
        onGenerateSchedule={() => console.log('generate')}
        disabled={disabled}
        message='test'
      />
    </>
  ) : (
    <PageLoader />
  );
};
