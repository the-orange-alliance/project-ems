import { FC, useState } from 'react';
import { ScheduleFooter } from '../schedule-footer.js';
import {
  generateScheduleItems,
  getScheduleValidation,
  ScheduleParams as EventScheduleParams
} from '@toa-lib/models';
import { PageLoader } from 'src/components/loading/index.js';
import {
  deleteScheduleItems,
  postScheduleItems,
  useScheduleItemsForTournament
} from 'src/api/use-schedule-data.js';
import { ScheduleLayout } from '../schedule-layout.js';
import { ScheduleTable } from 'src/components/tables/schedule-table.js';
import { DefaultScheduleOptions } from '../tournaments/default-params.js';
import { RoudnRobinScheduleOptions } from '../tournaments/round-robin-params.js';
import { Divider } from 'antd';

interface Props {
  eventSchedule?: EventScheduleParams;
  onEventScheduleChange?: (eventSchedule: EventScheduleParams) => void;
  disabled?: boolean;
}

export const ScheduleParams: FC<Props> = ({
  eventSchedule,
  disabled,
  onEventScheduleChange
}) => {
  const [loading, setLoading] = useState(false);
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
  const handleScheduleChange = (schedule: EventScheduleParams) => {
    if (!eventSchedule) return;
    onEventScheduleChange?.(schedule);
  };
  const generateSchedule = async () => {
    if (!eventSchedule) return;
    setLoading(true);
    const scheduleItems = generateScheduleItems(eventSchedule);
    await deleteScheduleItems(
      eventSchedule.eventKey,
      eventSchedule.tournamentKey
    );
    await postScheduleItems(scheduleItems);
    mutateScheduleItems(scheduleItems);
    setLoading(false);
  };
  return !isLoading ? (
    <>
      <Divider>Tournament Schedule Configurations</Divider>
      <ScheduleOptions
        eventSchedule={eventSchedule}
        disabled={!canEdit}
        onChange={handleScheduleChange}
      />
      <Divider>Tournament Day Configurations</Divider>
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
  eventSchedule?: EventScheduleParams;
  disabled?: boolean;
  onChange: (eventSchedule: EventScheduleParams) => void;
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
