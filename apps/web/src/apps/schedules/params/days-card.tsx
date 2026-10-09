import { PlusOutlined } from '@ant-design/icons';
import {
  Day,
  ScheduleIssue,
  ScheduleParams,
  SchedulePlan,
  defaultDay,
  getExtraMinutesNeeded
} from '@toa-lib/models';
import { Button, Card, Empty, Flex, Progress, Typography } from 'antd';
import { DateTime } from 'luxon';
import { FC } from 'react';
import { DayCard } from './day-card.js';
import { formatDuration } from './match-plan.js';
import { shiftDays } from './time.js';

interface Props {
  schedule: ScheduleParams;
  plan: SchedulePlan;
  issues: ScheduleIssue[];
  disabled?: boolean;
  onChange: (schedule: ScheduleParams) => void;
}

const firstDay = (): Day => {
  const start = DateTime.now().set({
    hour: 9,
    minute: 0,
    second: 0,
    millisecond: 0
  });
  return {
    ...defaultDay,
    startTime: start.toISO() ?? defaultDay.startTime,
    endTime: start.set({ hour: 17 }).toISO() ?? defaultDay.endTime,
    breaks: []
  };
};

/** The day after `day`, with the same hours and breaks. */
const dayAfter = (day: Day): Day => ({
  ...day,
  startTime: shiftDays(day.startTime, 1),
  endTime: shiftDays(day.endTime, 1),
  breaks: day.breaks.map((b) => ({
    ...b,
    startTime: shiftDays(b.startTime, 1),
    endTime: shiftDays(b.endTime, 1)
  }))
});

export const DaysCard: FC<Props> = ({
  schedule,
  plan,
  issues,
  disabled,
  onChange
}) => {
  const { days } = schedule;
  const placed = plan.total - plan.unscheduled;
  const setDays = (next: Day[]) => onChange({ ...schedule, days: next });
  const addDay = () => {
    const last = days.at(-1);
    setDays([...days, last ? dayAfter(last) : firstDay()]);
  };

  return (
    <Card
      title='Match days'
      size='small'
      extra={
        <Button
          type='primary'
          icon={<PlusOutlined />}
          disabled={disabled}
          onClick={addDay}
        >
          Add day
        </Button>
      }
    >
      <Flex vertical gap={4} style={{ marginBottom: 16 }}>
        <Typography.Text>
          {placed} of {plan.total} matches fit in your days
          {plan.unscheduled > 0 && (
            <Typography.Text type='danger'>
              {' '}
              · add about{' '}
              {formatDuration(getExtraMinutesNeeded(schedule, plan))} or another
              day
            </Typography.Text>
          )}
        </Typography.Text>
        <Progress
          percent={plan.total > 0 ? (placed / plan.total) * 100 : 0}
          status={plan.unscheduled > 0 ? 'active' : 'success'}
          showInfo={false}
        />
      </Flex>
      {days.length === 0 ? (
        <Empty description='Add a day, set when play starts and ends, and the matches that fit are worked out for you.'>
          <Button
            type='primary'
            icon={<PlusOutlined />}
            disabled={disabled}
            onClick={addDay}
          >
            Add first day
          </Button>
        </Empty>
      ) : (
        <Flex vertical gap={16}>
          {days.map((day, i) => (
            <DayCard
              key={i}
              day={day}
              index={i}
              plan={plan.days[i]}
              issues={issues.filter((issue) => issue.dayIndex === i)}
              disabled={disabled}
              onChange={(next) =>
                setDays(days.map((d, j) => (j === i ? next : d)))
              }
              onRemove={() => setDays(days.filter((_, j) => j !== i))}
            />
          ))}
        </Flex>
      )}
    </Card>
  );
};
