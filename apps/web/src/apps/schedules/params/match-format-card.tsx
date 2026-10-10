import {
  ScheduleOptions,
  ScheduleParams,
  isPlayoffsTournamentType
} from '@toa-lib/models';
import {
  Card,
  Col,
  Flex,
  Form,
  InputNumber,
  Row,
  Segmented,
  Statistic,
  Switch,
  Typography
} from 'antd';
import { FC } from 'react';
import { getMatchPlan } from './match-plan.js';

interface Props {
  schedule: ScheduleParams;
  /** Fields the tournament has, to sanity-check simultaneous matches. */
  fieldCount?: number;
  disabled?: boolean;
  onChange: (schedule: ScheduleParams) => void;
}

interface NumberFieldProps {
  label: string;
  value: number | undefined;
  min: number;
  max?: number;
  extra?: string;
  warn?: boolean;
  disabled?: boolean;
  onChange: (value: number) => void;
}

const NumberField: FC<NumberFieldProps> = ({
  label,
  value,
  min,
  max,
  extra,
  warn,
  disabled,
  onChange
}) => (
  <Form.Item label={label} extra={extra}>
    <InputNumber
      value={value}
      min={min}
      max={max}
      precision={0}
      status={warn ? 'warning' : undefined}
      disabled={disabled}
      style={{ width: '100%' }}
      onChange={(next) => next !== null && onChange(next)}
    />
  </Form.Item>
);

export const MatchFormatCard: FC<Props> = ({
  schedule,
  fieldCount,
  disabled,
  onChange
}) => {
  const plan = getMatchPlan(schedule);
  const playoffs = isPlayoffsTournamentType(schedule.type);
  const set = (changes: Partial<ScheduleParams>) =>
    onChange({ ...schedule, ...changes });
  const setOption = (changes: Partial<ScheduleOptions>) =>
    set({ options: { ...schedule.options, ...changes } });
  const tooManyConcurrent =
    fieldCount !== undefined && schedule.matchConcurrency > fieldCount;

  return (
    <Card title='Match format' size='small'>
      <Flex gap={24} align='center' wrap style={{ marginBottom: 16 }}>
        <Statistic title='Matches needed' value={plan.total} />
        <Flex vertical>
          <Typography.Text type='secondary'>{plan.formula}</Typography.Text>
          {plan.surrogateSlots > 0 && (
            <Typography.Text type='secondary'>
              Includes {plan.surrogateSlots} surrogate{' '}
              {plan.surrogateSlots === 1 ? 'slot' : 'slots'} to fill the matches
              evenly.
            </Typography.Text>
          )}
        </Flex>
      </Flex>
      <Form layout='vertical'>
        <Row gutter={16}>
          {!playoffs && (
            <Col xs={24} sm={12} lg={8}>
              <NumberField
                label='Matches per team'
                value={schedule.matchesPerTeam}
                min={1}
                disabled={disabled}
                onChange={(matchesPerTeam) => set({ matchesPerTeam })}
              />
            </Col>
          )}
          <Col xs={24} sm={12} lg={8}>
            <NumberField
              label='Teams per alliance'
              value={schedule.options.teamsPerAlliance}
              min={1}
              max={6}
              disabled={disabled}
              onChange={(teamsPerAlliance) => setOption({ teamsPerAlliance })}
            />
          </Col>
          {playoffs && schedule.type !== 'Finals' && (
            <Col xs={24} sm={12} lg={8}>
              <NumberField
                label='Rounds'
                value={schedule.options.rounds}
                min={1}
                disabled={disabled}
                onChange={(rounds) => setOption({ rounds })}
              />
            </Col>
          )}
          {schedule.type === 'Finals' && (
            <Col xs={24} sm={12} lg={8}>
              <Form.Item label='Series length'>
                <Segmented
                  block
                  disabled={disabled}
                  value={schedule.options.seriesType ?? 3}
                  options={[
                    { value: 1, label: 'Best of 1' },
                    { value: 3, label: 'Best of 3' },
                    { value: 5, label: 'Best of 5' }
                  ]}
                  onChange={(seriesType) =>
                    setOption({ seriesType: seriesType as 1 | 3 | 5 })
                  }
                />
              </Form.Item>
            </Col>
          )}
          <Col xs={24} sm={12} lg={8}>
            <NumberField
              label='Cycle time (minutes)'
              value={schedule.cycleTime}
              min={1}
              extra='Time between the start of one match and the next.'
              disabled={disabled}
              onChange={(cycleTime) => set({ cycleTime })}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <NumberField
              label='Simultaneous matches'
              value={schedule.matchConcurrency}
              min={1}
              warn={tooManyConcurrent}
              extra={
                tooManyConcurrent
                  ? `This tournament only has ${fieldCount} field${fieldCount === 1 ? '' : 's'}.`
                  : 'Matches that start at the same time, one per field.'
              }
              disabled={disabled}
              onChange={(matchConcurrency) => set({ matchConcurrency })}
            />
          </Col>
          {!playoffs && (
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                label='Premiere field'
                extra='Assign matches to the premiere field.'
              >
                <Switch
                  checked={schedule.hasPremiereField}
                  disabled={disabled}
                  onChange={(hasPremiereField) => set({ hasPremiereField })}
                />
              </Form.Item>
            </Col>
          )}
        </Row>
      </Form>
    </Card>
  );
};
