import { Row, Col, Input, InputNumber } from 'antd';
import { ScheduleParams, DayBreak } from '@toa-lib/models';
import { DateTime } from 'luxon';
import { FC, useState } from 'react';

interface Props {
  eventSchedule: ScheduleParams;
  dayId: number;
  breakId: number;
  disabled?: boolean;
  onChange: (schedule: ScheduleParams) => void;
}

export const ScheduleBreak: FC<Props> = ({
  dayId,
  breakId,
  eventSchedule,
  disabled,
  onChange
}) => {
  const day = eventSchedule.days[dayId];
  const dayBreak = day.breaks[breakId];
  const [startDate, setStartDate] = useState<DateTime | null>(DateTime.now());
  const [endDate, setEndDate] = useState<DateTime | null>(DateTime.now());

  const handleChange = (name: string, value: string | number | null) => {
    const newBreak = {
      ...dayBreak,
      [name]: typeof value === 'number' ? value : (value ?? '')
    };
    const newStartTime = DateTime.fromISO(day.startTime).plus({
      minutes:
        Math.ceil(newBreak.afterMatch / eventSchedule.matchConcurrency) *
        eventSchedule.cycleTime
    });
    const newEndTime = newStartTime.plus({
      minutes: newBreak.duration
    });
    newBreak.startTime = newStartTime.toISO() ?? '';
    newBreak.endTime = newEndTime.toISO() ?? '';
    const endDateTime = getEndDate(newBreak);
    setStartDate(newStartTime);
    setEndDate(newEndTime);
    updateScheduleDayBreak(newBreak, endDateTime);
  };

  const getEndDate = (dayBreak: DayBreak): DateTime => {
    const endDateTime = DateTime.fromISO(eventSchedule.days[dayId].endTime);
    const newBreaks = eventSchedule.days[dayId].breaks.map((b) =>
      b.id === breakId ? dayBreak : b
    );
    const oldBreaksDuration =
      day.breaks.length > 0
        ? day.breaks
            .map((dayBreak) => dayBreak.duration)
            .reduce((prev, curr) => prev + curr)
        : 0;
    const breaksDuration =
      newBreaks.length > 0
        ? newBreaks
            .map((dayBreak) => dayBreak.duration)
            .reduce((prev, curr) => prev + curr)
        : 0;
    return endDateTime.plus({ minutes: breaksDuration - oldBreaksDuration });
  };

  const updateScheduleDayBreak = (dayBreak: DayBreak, newEndTime: DateTime) => {
    const dayBreaks = eventSchedule.days[dayId].breaks;
    const newSchedule = {
      ...eventSchedule,
      days: eventSchedule.days.map((d) =>
        d.id === dayId
          ? {
              ...d,
              endTime: newEndTime.toISO() ?? '',
              breaks: dayBreaks.map((b) => (b.id === breakId ? dayBreak : b))
            }
          : d
      )
    };
    onChange(newSchedule);
  };

  return (
    <Row gutter={[24, 24]} style={{ paddingTop: 8, paddingBottom: 16 }}>
      <Col xs={24} sm={12} md={8} lg={4}>
        <label style={{ display: 'block', marginBottom: 4 }} htmlFor={`break-name-${dayId}-${breakId}`}>Break Name</label>
        <Input
          id={`break-name-${dayId}-${breakId}`}
          name='name'
          placeholder='Break Name'
          value={dayBreak.name}
          onChange={(e) => handleChange('name', e.target.value)}
          disabled={disabled}
        />
      </Col>
      <Col xs={24} sm={12} md={8} lg={2}>
        <label style={{ display: 'block', marginBottom: 4 }} htmlFor={`break-afterMatch-${dayId}-${breakId}`}>After Match</label>
        <InputNumber
          id={`break-afterMatch-${dayId}-${breakId}`}
          name='afterMatch'
          placeholder='Match'
          value={dayBreak.afterMatch}
          onChange={(value) => handleChange('afterMatch', value)}
          min={0}
          style={{ width: '100%' }}
          disabled={disabled}
        />
      </Col>
      <Col xs={24} sm={12} md={8} lg={2}>
        <label style={{ display: 'block', marginBottom: 4 }} htmlFor={`break-duration-${dayId}-${breakId}`}>Duration (min)</label>
        <InputNumber
          id={`break-duration-${dayId}-${breakId}`}
          name='duration'
          placeholder='Duration'
          value={dayBreak.duration}
          onChange={(value) => handleChange('duration', value)}
          min={0}
          style={{ width: '100%' }}
          disabled={disabled}
        />
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <label style={{ display: 'block', marginBottom: 4 }} htmlFor={`break-startDate-${dayId}-${breakId}`}>Start Time</label>
        <Input
          id={`break-startDate-${dayId}-${breakId}`}
          value={startDate ? startDate.toFormat('yyyy-MM-dd HH:mm') : ''}
          disabled
          style={{ width: '100%' }}
          placeholder='Start Date'
        />
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <label style={{ display: 'block', marginBottom: 4 }} htmlFor={`break-endDate-${dayId}-${breakId}`}>End Time</label>
        <Input
          id={`break-endDate-${dayId}-${breakId}`}
          value={endDate ? endDate.toFormat('yyyy-MM-dd HH:mm') : ''}
          disabled
          style={{ width: '100%' }}
          placeholder='End Date'
        />
      </Col>
    </Row>
  );
};
