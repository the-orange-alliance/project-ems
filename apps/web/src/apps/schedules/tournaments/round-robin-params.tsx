import { Row, Col, InputNumber } from 'antd';
import { calculateTotalMatches, ScheduleParams } from '@toa-lib/models';
import { FC, useEffect, useState } from 'react';

interface Props {
  eventSchedule?: ScheduleParams;
  disabled?: boolean;
  onChange: (schedule: ScheduleParams) => void;
}

export const RoudnRobinScheduleOptions: FC<Props> = ({
  eventSchedule,
  disabled,
  onChange
}) => {
  const [totalMatches, setTotalMatches] = useState<number>(
    eventSchedule ? calculateTotalMatches(eventSchedule) : 0
  );
  useEffect(() => {
    if (!eventSchedule) return;
    setTotalMatches(calculateTotalMatches(eventSchedule));
  }, [eventSchedule?.matchesPerTeam, eventSchedule?.options]);

  const handleChange = (name: string, value: number | null) => {
    if (!eventSchedule) return;
    onChange({
      ...eventSchedule,
      [name]: value ?? 0
    });
  };

  const handleRoundsChange = (value: number | null) => {
    if (!eventSchedule) return;
    onChange({
      ...eventSchedule,
      options: {
        ...eventSchedule.options,
        rounds: value ?? 0
      }
    });
  };

  return (
    <Row gutter={[24, 24]} style={{ marginBottom: 16 }}>
      <Col xs={24} sm={12} md={8} lg={4}>
        <div style={{ marginBottom: 4 }}>Match Concurrency</div>
        <InputNumber
          name='matchConcurrency'
          value={eventSchedule?.matchConcurrency}
          disabled={disabled}
          min={1}
          style={{ width: '100%' }}
          onChange={(value) => handleChange('matchConcurrency', value)}
        />
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <div style={{ marginBottom: 4 }}>Cycle Time</div>
        <InputNumber
          name='cycleTime'
          value={eventSchedule?.cycleTime}
          disabled={disabled}
          min={0}
          style={{ width: '100%' }}
          onChange={(value) => handleChange('cycleTime', value)}
        />
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <div style={{ marginBottom: 4 }}>Rounds</div>
        <InputNumber
          name='rounds'
          value={eventSchedule?.options?.rounds}
          disabled={disabled}
          min={0}
          style={{ width: '100%' }}
          onChange={handleRoundsChange}
        />
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <div style={{ marginBottom: 4 }}>Teams Scheduled</div>
        <InputNumber
          value={eventSchedule?.teamKeys.length}
          disabled
          style={{ width: '100%' }}
        />
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <div style={{ marginBottom: 4 }}>Alliances Scheduled</div>
        <InputNumber
          value={eventSchedule?.options.allianceCount}
          disabled
          style={{ width: '100%' }}
        />
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <div style={{ marginBottom: 4 }}>Total Matches</div>
        <InputNumber value={totalMatches} disabled style={{ width: '100%' }} />
      </Col>
    </Row>
  );
};
