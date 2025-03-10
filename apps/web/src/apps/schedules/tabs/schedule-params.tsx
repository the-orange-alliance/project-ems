import { FC, useState } from 'react';
import { ScheduleFooter } from '../schedule-footer';
import {
  EventSchedule,
  generateScheduleItems,
  getScheduleValidation
} from '@toa-lib/models';
import { PageLoader } from 'src/components/loading';
import {
  deleteSchedule,
  postSchedule,
  useScheduleItemsForTournament
} from 'src/api/use-schedule-data';
import { useSWRConfig } from 'swr';
import { setApiStorage } from 'src/api/use-storage-data';
import { ScheduleLayout } from '../schedule-layout';
import { ScheduleTable } from 'src/components/tables/schedule-table';
import { DefaultScheduleOptions } from '../tournaments/default-params';
import { RoudnRobinScheduleOptions } from '../tournaments/round-robin-params';

interface Props {
  eventSchedule?: EventSchedule;
  disabled?: boolean;
}

export const ScheduleParams: FC<Props> = ({ eventSchedule, disabled }) => {
  const [loading, setLoading] = useState(false);
  const { mutate } = useSWRConfig();
  const {
    data: scheduleItems,
    isLoading,
    mutate: mutateScheduleItems
  } = useScheduleItemsForTournament(
    eventSchedule?.eventKey,
    eventSchedule?.tournamentKey
  );
  const { valid, validationMessage } = getScheduleValidation(eventSchedule);
  const canEdit = !disabled && eventSchedule && !loading;
  const handleScheduleChange = (schedule: EventSchedule) => {
    if (!eventSchedule) return;
    mutate(
      `storage/${eventSchedule.eventKey}_${eventSchedule.tournamentKey}.json`,
      schedule,
      { revalidate: false }
    );
  };
  const generateSchedule = async () => {
    if (!eventSchedule) return;
    setLoading(true);
    const scheduleItems = generateScheduleItems(eventSchedule);
    await deleteSchedule(eventSchedule.eventKey, eventSchedule.tournamentKey);
    await setApiStorage(
      `${eventSchedule.eventKey}_${eventSchedule.tournamentKey}.json`,
      eventSchedule
    );
    await postSchedule(scheduleItems);
    mutateScheduleItems(scheduleItems);
    setLoading(false);
  };
  return !isLoading ? (
    <>
      <ScheduleOptions
        eventSchedule={eventSchedule}
        disabled={!canEdit}
        onChange={handleScheduleChange}
      />
      <ScheduleLayout
        eventSchedule={eventSchedule}
        disabled={!canEdit}
        onChange={handleScheduleChange}
      />
      <ScheduleFooter
        onGenerateSchedule={generateSchedule}
        disabled={!canEdit || !valid || loading}
        message={validationMessage}
      />
      {scheduleItems && scheduleItems.length > 0 && (
        <ScheduleTable items={scheduleItems} />
      )}
    </>
  ) : (
    <PageLoader />
  );
};

interface ScheduleOptionsProps {
  eventSchedule?: EventSchedule;
  disabled?: boolean;
  onChange: (eventSchedule: EventSchedule) => void;
}

export const ScheduleOptions: FC<ScheduleOptionsProps> = ({
  eventSchedule,
  disabled,
  onChange
}) => {
  if (!eventSchedule) return <div>Please select a tournament.</div>;
  switch (eventSchedule.type) {
    case 'Round Robin':
      return (
        <RoudnRobinScheduleOptions
          eventSchedule={eventSchedule}
          disabled={disabled}
          onChange={onChange}
        />
      );
    default:
      return (
        <DefaultScheduleOptions
          eventSchedule={eventSchedule}
          disabled={disabled}
          onChange={onChange}
        />
      );
  }
};
