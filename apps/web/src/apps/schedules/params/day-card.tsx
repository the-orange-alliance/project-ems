import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Day,
  DayBreak,
  DayPlan,
  ScheduleIssue,
  defaultBreak
} from '@toa-lib/models';
import {
  Button,
  Card,
  DatePicker,
  Divider,
  Flex,
  Popconfirm,
  TimePicker,
  Typography
} from 'antd';
import { DateTime } from 'luxon';
import { FC } from 'react';
import { BreakRow } from './break-row.js';
import { Field } from './field.js';
import {
  CLOCK_FORMAT,
  formatClock,
  toPickerValue,
  withClock,
  withDate
} from './time.js';

const MS_PER_MINUTE = 60_000;
const NEW_BREAK_MINUTES = 30;
const MINUTE_STEP = 5;

/** A new break in the middle of the day, nudged past any break already there. */
const suggestBreak = (day: Day) => {
  const dayStart = DateTime.fromISO(day.startTime).toMillis();
  const dayEnd = DateTime.fromISO(day.endTime).toMillis();
  const length = NEW_BREAK_MINUTES * MS_PER_MINUTE;
  const step = MINUTE_STEP * MS_PER_MINUTE;
  let start = Math.round((dayStart + (dayEnd - dayStart) / 2) / step) * step;
  const taken = day.breaks
    .map((b) => {
      const from = DateTime.fromISO(b.startTime).toMillis();
      return { from, to: from + b.duration * MS_PER_MINUTE };
    })
    .sort((a, b) => a.from - b.from);
  for (const { from, to } of taken) {
    if (start < to && start + length > from) start = to;
  }
  const startTime = DateTime.fromMillis(start).toISO() ?? day.startTime;
  return {
    ...defaultBreak,
    id: day.breaks.length,
    startTime,
    endTime: startTime,
    duration: NEW_BREAK_MINUTES
  };
};

interface Props {
  day: Day;
  index: number;
  plan: DayPlan;
  /** Issues for this day only. */
  issues: ScheduleIssue[];
  disabled?: boolean;
  onChange: (day: Day) => void;
  onRemove: () => void;
}

export const DayCard: FC<Props> = ({
  day,
  index,
  plan,
  issues,
  disabled,
  onChange,
  onRemove
}) => {
  const { capacity, timeline } = plan;
  const start = DateTime.fromISO(day.startTime);
  const windowStart = toPickerValue(day.startTime);
  const windowEnd = toPickerValue(day.endTime);
  const windowHasError = issues.some(
    (i) => i.severity === 'error' && i.breakIndex === undefined
  );
  const placedBreaks = new Map(
    timeline.entries.flatMap((e) =>
      e.type === 'break' ? [[e.breakIndex, e] as const] : []
    )
  );

  const setBreak = (breakIndex: number, changes: Partial<DayBreak>) =>
    onChange({
      ...day,
      breaks: day.breaks.map((b, i) =>
        i === breakIndex ? { ...b, ...changes } : b
      )
    });

  return (
    <Card
      size='small'
      title={
        <Flex gap={8} align='baseline'>
          <span>Day {index + 1}</span>
          <Typography.Text type='secondary'>
            {start.isValid ? start.toFormat('cccc, LLL d') : ''}
          </Typography.Text>
        </Flex>
      }
      extra={
        <Popconfirm
          title={`Remove day ${index + 1}?`}
          okText='Remove'
          okButtonProps={{ danger: true }}
          disabled={disabled}
          onConfirm={onRemove}
        >
          <Button
            type='text'
            danger
            icon={<DeleteOutlined />}
            disabled={disabled}
          >
            Remove
          </Button>
        </Popconfirm>
      }
    >
      <Flex gap={24} wrap align='flex-end'>
        <Field label='Date'>
          <DatePicker
            allowClear={false}
            format='ddd, MMM D'
            value={windowStart}
            disabled={disabled}
            onChange={(picked) =>
              picked &&
              onChange({
                ...day,
                startTime: withDate(day.startTime, picked),
                endTime: withDate(day.endTime, picked),
                breaks: day.breaks.map((b) => ({
                  ...b,
                  startTime: withDate(b.startTime, picked)
                }))
              })
            }
          />
        </Field>
        <Field label='Play from – until'>
          <TimePicker.RangePicker
            allowClear={false}
            needConfirm={false}
            minuteStep={MINUTE_STEP}
            format={CLOCK_FORMAT}
            value={windowStart && windowEnd ? [windowStart, windowEnd] : null}
            status={windowHasError ? 'error' : undefined}
            disabled={disabled}
            onChange={(range) =>
              range?.[0] &&
              range[1] &&
              onChange({
                ...day,
                startTime: withClock(day.startTime, range[0]),
                endTime: withClock(day.startTime, range[1])
              })
            }
          />
        </Field>
        <Field label='Matches this day'>
          <Typography.Text strong>
            {timeline.matchCount}{' '}
            <Typography.Text type='secondary'>
              of {capacity} that fit
            </Typography.Text>
          </Typography.Text>
        </Field>
        <Field label='Last match ends'>
          <Typography.Text strong>
            {timeline.matchCount > 0 ? formatClock(timeline.end) : '—'}
          </Typography.Text>
        </Field>
      </Flex>

      <Divider style={{ margin: '12px 0' }} />
      <Flex vertical gap={12}>
        {day.breaks.map((dayBreak, i) => (
          <BreakRow
            key={i}
            dayBreak={dayBreak}
            placed={placedBreaks.get(i)}
            hasError={issues.some(
              (issue) => issue.severity === 'error' && issue.breakIndex === i
            )}
            disabled={disabled}
            onChange={(changes) => setBreak(i, changes)}
            onRemove={() =>
              onChange({ ...day, breaks: day.breaks.filter((_, j) => j !== i) })
            }
          />
        ))}
        <div>
          <Button
            type='dashed'
            size='small'
            icon={<PlusOutlined />}
            disabled={disabled || !windowStart || !windowEnd}
            onClick={() =>
              onChange({ ...day, breaks: [...day.breaks, suggestBreak(day)] })
            }
          >
            Add break
          </Button>
        </div>
      </Flex>

      {issues.map((issue) => (
        <Typography.Text
          key={issue.message}
          type={issue.severity === 'error' ? 'danger' : 'warning'}
          style={{ display: 'block', marginTop: 8 }}
        >
          {issue.message}
        </Typography.Text>
      ))}
    </Card>
  );
};
