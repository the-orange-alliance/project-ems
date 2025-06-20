import { Button, Row, Col } from 'antd';
import { ScheduleParams, defaultDay } from '@toa-lib/models';
import { DateTime } from 'luxon';
import { FC } from 'react';
import { ScheduleDay } from './schedule-day.js';

interface Props {
  eventSchedule?: ScheduleParams;
  disabled?: boolean;
  onChange: (schedule: ScheduleParams) => void;
}

export const ScheduleLayout: FC<Props> = ({
  eventSchedule,
  disabled,
  onChange
}) => {
  const addDay = () => {
    if (!eventSchedule) return;
    const startTime =
      eventSchedule.days.length > 0
        ? (DateTime.fromISO(
            eventSchedule.days[eventSchedule.days.length - 1].startTime
          )
            .plus({ days: 1 })
            .toISO() ?? defaultDay.startTime)
        : defaultDay.startTime;
    const newDay = { ...defaultDay, id: eventSchedule.days.length, startTime };
    onChange({
      ...eventSchedule,
      days: [...eventSchedule.days, newDay]
    });
  };
  const removeDay = () => {
    if (!eventSchedule) return;
    onChange({
      ...eventSchedule,
      days: eventSchedule.days.slice(0, eventSchedule.days.length - 1)
    });
  };
  return (
    <div>
      {eventSchedule?.days.map((d) => (
        <ScheduleDay
          key={`day-${d.id}`}
          eventSchedule={eventSchedule}
          id={d.id}
          onChange={onChange}
          disabled={disabled}
        />
      ))}
      <Row gutter={[24, 24]} style={{ paddingTop: 8 }}>
        <Col xs={24} sm={12} md={6} lg={4}>
          <Button type='primary' block disabled={disabled} onClick={addDay}>
            Add Day
          </Button>
        </Col>
        <Col xs={24} sm={12} md={6} lg={4}>
          <Button
            type='primary'
            danger
            block
            disabled={disabled || !eventSchedule?.days.length}
            onClick={removeDay}
          >
            Remove Day
          </Button>
        </Col>
      </Row>
    </div>
  );
};
