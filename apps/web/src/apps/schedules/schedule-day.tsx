import {
  Row,
  Col,
  Typography,
  InputNumber,
  Button,
  Divider,
  DatePicker
} from 'antd';
import { Day, ScheduleParams, defaultBreak } from '@toa-lib/models';
import { DateTime } from 'luxon';
import { FC, useEffect, useState } from 'react';
import { ScheduleBreak } from './schedule-break.js';
import dayjs from 'dayjs';

interface Props {
  eventSchedule: ScheduleParams;
  id: number;
  disabled?: boolean;
  onChange: (schedule: ScheduleParams) => void;
}

export const ScheduleDay: FC<Props> = ({
  eventSchedule,
  id,
  disabled,
  onChange
}) => {
  const day = eventSchedule.days[id];
  const [startDate, setStartDate] = useState<DateTime | null>(
    DateTime.fromISO(day.startTime)
  );
  const [endDate, setEndDate] = useState<DateTime | null>(DateTime.now());

  useEffect(() => {
    const endDateTime = getEndDate(day);
    setEndDate(endDateTime);
  }, [day.breaks]);

  const changeMatches = (value: number | null) => {
    const dayWithoutEndTime = {
      ...day,
      scheduledMatches: value ?? 0
    };
    const endDateTime = getEndDate(dayWithoutEndTime);
    const newDay = {
      ...dayWithoutEndTime,
      endTime: endDateTime.toISO() ?? ''
    };
    setEndDate(endDateTime);
    updateScheduleDay(newDay);
  };

  const changeStartTime = (value: any) => {
    // value is a moment object from antd DatePicker
    const newTime = value
      ? DateTime.fromJSDate(value.toDate()).toISO()
      : DateTime.now().toISO();
    const dayWithoutEndTime = { ...day, startTime: newTime ?? '' };
    const endDateTime = getEndDate(dayWithoutEndTime);
    const newDay = {
      ...dayWithoutEndTime,
      endTime: endDateTime.toISO() ?? ''
    };
    setStartDate(newTime ? DateTime.fromISO(newTime) : null);
    setEndDate(endDateTime);
    updateScheduleDay(newDay);
  };

  const addBreak = () => {
    const newBreak = { ...defaultBreak, id: day.breaks.length };
    const newDay = {
      ...day,
      breaks: [...day.breaks, newBreak]
    };
    const newEndTime = getEndDate(newDay);
    updateScheduleDay({ ...newDay, endTime: newEndTime.toISO() ?? '' });
  };

  const removeBreak = () => {
    const newBreaks = day.breaks.slice(0, day.breaks.length - 1);
    const newDay = {
      ...day,
      breaks: newBreaks
    };
    const newEndTime = getEndDate(newDay);
    updateScheduleDay({ ...newDay, endTime: newEndTime.toISO() ?? '' });
  };

  const getEndDate = (newDay: Day): DateTime => {
    const matchesDuration =
      Math.ceil(newDay.scheduledMatches / eventSchedule.matchConcurrency) *
      eventSchedule.cycleTime;

    const breaksDuration =
      newDay.breaks.length > 0
        ? newDay.breaks
            .map((dayBreak) => dayBreak.duration)
            .reduce((prev, curr) => prev + curr)
        : 0;
    const newEndTime = DateTime.fromISO(newDay.startTime).plus({
      minutes: matchesDuration + breaksDuration
    });
    return newEndTime;
  };

  const updateScheduleDay = (day: Day) => {
    const newSchedule = {
      ...eventSchedule,
      days: eventSchedule.days.map((d) => (d.id === id ? day : d))
    };
    onChange(newSchedule);
  };

  return (
    <>
      <Row
        gutter={[24, 24]}
        style={{ paddingTop: 8, paddingBottom: 8 }}
        align='middle'
      >
        <Col xs={24} sm={6} md={4} lg={2}>
          <div style={{ marginBottom: 4 }}>Day</div>
          <Typography.Text>{day.id}</Typography.Text>
        </Col>
        <Col xs={24} sm={8} md={6} lg={4}>
          <div style={{ marginBottom: 4 }}>Scheduled Matches</div>
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            value={day.scheduledMatches}
            onChange={changeMatches}
            disabled={disabled}
            placeholder='Scheduled Matches'
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <div style={{ marginBottom: 4 }}>Start Date</div>
          <DatePicker
            showTime
            value={startDate ? dayjs(startDate.toJSDate()) : null}
            onChange={changeStartTime}
            style={{ width: '100%' }}
            disabled={disabled}
            placeholder='Start Date'
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <div style={{ marginBottom: 4 }}>End Date</div>
          <DatePicker
            showTime
            value={endDate ? dayjs(endDate.toJSDate()) : null}
            disabled
            style={{ width: '100%' }}
            placeholder='End Date'
          />
        </Col>
      </Row>
      {day.breaks.map((dayBreak) => (
        <ScheduleBreak
          key={`day-${id}-break-${dayBreak.id}`}
          eventSchedule={eventSchedule}
          dayId={id}
          breakId={dayBreak.id}
          onChange={onChange}
          disabled={disabled}
        />
      ))}
      <Row gutter={[24, 24]}>
        <Col xs={24} md={4} lg={2}>
          <Button type='primary' block onClick={addBreak} disabled={disabled}>
            Add Break
          </Button>
        </Col>
        <Col xs={24} md={4} lg={2}>
          <Button
            type='primary'
            block
            danger
            disabled={day.breaks.length <= 0 || disabled}
            onClick={removeBreak}
          >
            Remove Break
          </Button>
        </Col>
      </Row>
      <Divider style={{ marginTop: 8, marginBottom: 8 }} />
    </>
  );
};
