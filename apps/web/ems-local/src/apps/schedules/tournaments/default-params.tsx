import { Row, Col, Form, Select, InputNumber } from 'antd';
import { ScheduleParams, calculateTotalMatches } from '@toa-lib/models';
import { FC, useEffect, useState } from 'react';

interface Props {
  eventSchedule?: ScheduleParams;
  disabled?: boolean;
  onChange: (schedule: ScheduleParams) => void;
}

export const DefaultScheduleOptions: FC<Props> = ({
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

  const handleNumberChange = (name: string, value: number | null) => {
    if (!eventSchedule) return;
    onChange({
      ...eventSchedule,
      [name]: value ?? 0
    });
  };

  const handleSelectChange = (name: string, value: number) => {
    if (!eventSchedule) return;
    onChange({
      ...eventSchedule,
      [name]: Boolean(value)
    });
  };

  return (
    <Row gutter={[24, 24]} style={{ marginBottom: 16 }}>
      <Col xs={24} sm={12} md={8} lg={4}>
        <Form.Item
          label='Premiere Field'
          labelCol={{ span: 24 }}
          wrapperCol={{ span: 24 }}
        >
          <Select
            value={eventSchedule?.hasPremiereField ? 1 : 0}
            disabled={disabled}
            onChange={(value) => handleSelectChange('hasPremiereField', value)}
            options={[
              { value: 0, label: 'No' },
              { value: 1, label: 'Yes' }
            ]}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <Form.Item
          label='Match Concurrency'
          labelCol={{ span: 24 }}
          wrapperCol={{ span: 24 }}
        >
          <InputNumber
            name='matchConcurrency'
            value={eventSchedule?.matchConcurrency}
            disabled={disabled}
            min={1}
            style={{ width: '100%' }}
            onChange={(value) => handleNumberChange('matchConcurrency', value)}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <Form.Item
          label='Cycle Time'
          labelCol={{ span: 24 }}
          wrapperCol={{ span: 24 }}
        >
          <InputNumber
            name='cycleTime'
            value={eventSchedule?.cycleTime}
            disabled={disabled}
            min={0}
            style={{ width: '100%' }}
            onChange={(value) => handleNumberChange('cycleTime', value)}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <Form.Item
          label='Matches Per Team'
          labelCol={{ span: 24 }}
          wrapperCol={{ span: 24 }}
        >
          <InputNumber
            name='matchesPerTeam'
            value={eventSchedule?.matchesPerTeam}
            disabled={disabled}
            min={0}
            style={{ width: '100%' }}
            onChange={(value) => handleNumberChange('matchesPerTeam', value)}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <Form.Item
          label='Teams Scheduled'
          labelCol={{ span: 24 }}
          wrapperCol={{ span: 24 }}
        >
          <InputNumber
            value={eventSchedule?.teamKeys.length}
            disabled
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <Form.Item
          label='Total Matches'
          labelCol={{ span: 24 }}
          wrapperCol={{ span: 24 }}
        >
          <InputNumber
            value={totalMatches}
            disabled
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Col>
    </Row>
  );
};
