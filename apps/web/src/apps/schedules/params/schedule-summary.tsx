import {
  CheckCircleFilled,
  CloudUploadOutlined,
  ExclamationCircleFilled,
  LoadingOutlined
} from '@ant-design/icons';
import { ScheduleIssue, ScheduleParams, SchedulePlan } from '@toa-lib/models';
import { Alert, Button, Card, Descriptions, Flex, Popconfirm, Tag } from 'antd';
import { DateTime } from 'luxon';
import { FC, ReactNode } from 'react';
import { SaveStatus } from './use-schedule-draft.js';

const WINDOW_FORMAT = 'ccc, LLL d · h:mm a';

interface Props {
  schedule: ScheduleParams;
  plan: SchedulePlan;
  issues: ScheduleIssue[];
  saveStatus: SaveStatus;
  hasSavedItems: boolean;
  /** Whether the saved items already match the current parameters. */
  upToDate: boolean;
  generating: boolean;
  locked?: boolean;
  onGenerate: () => void;
  onRetrySave: () => void;
}

const SaveTag: FC<{ status: SaveStatus; onRetry: () => void }> = ({
  status,
  onRetry
}) => {
  switch (status) {
    case 'saving':
      return <Tag icon={<LoadingOutlined />}>Saving…</Tag>;
    case 'unsaved':
      return <Tag color='warning'>Unsaved changes</Tag>;
    case 'error':
      return (
        <Tag color='error'>
          Couldn&apos;t save · <a onClick={onRetry}>Retry</a>
        </Tag>
      );
    default:
      return (
        <Tag color='success' icon={<CheckCircleFilled />}>
          Saved
        </Tag>
      );
  }
};

/** From the first day with matches to the end of the last one. */
const getPlayWindow = (
  plan: SchedulePlan,
  schedule: ScheduleParams
): string => {
  const used = plan.days
    .map((day, i) => ({ day, start: schedule.days[i].startTime }))
    .filter(({ day }) => day.timeline.matchCount > 0);
  if (used.length === 0) return '—';
  const first = DateTime.fromISO(used[0].start);
  const last = DateTime.fromMillis(used[used.length - 1].day.timeline.end);
  return `${first.toFormat(WINDOW_FORMAT)} → ${last.toFormat(WINDOW_FORMAT)}`;
};

const IssueList: FC<{ issues: ScheduleIssue[] }> = ({ issues }) => (
  <ul style={{ margin: 0, paddingLeft: 16 }}>
    {issues.map((issue) => (
      <li key={issue.message}>{issue.message}</li>
    ))}
  </ul>
);

export const ScheduleSummary: FC<Props> = ({
  schedule,
  plan,
  issues,
  saveStatus,
  hasSavedItems,
  upToDate,
  generating,
  locked,
  onGenerate,
  onRetrySave
}) => {
  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  const ready = errors.length === 0;
  const daysUsed = plan.days.filter((d) => d.timeline.matchCount > 0).length;

  const generateButton = (onClick?: () => void): ReactNode => (
    <Button
      type='primary'
      size='large'
      block
      icon={<CloudUploadOutlined />}
      loading={generating}
      disabled={!ready || locked}
      onClick={onClick}
    >
      {hasSavedItems ? 'Regenerate schedule' : 'Generate schedule'}
    </Button>
  );

  return (
    <Card
      title='Summary'
      size='small'
      extra={<SaveTag status={saveStatus} onRetry={onRetrySave} />}
      style={{ position: 'sticky', top: 56 }}
    >
      <Flex vertical gap={16}>
        {ready ? (
          <Alert
            type='success'
            showIcon
            title='Ready to generate'
            description='Every match fits in the days you set up.'
          />
        ) : (
          <Alert
            type='warning'
            showIcon
            icon={<ExclamationCircleFilled />}
            title={`${errors.length} ${errors.length === 1 ? 'thing needs' : 'things need'} fixing`}
            description={<IssueList issues={errors} />}
          />
        )}
        {warnings.length > 0 && (
          <Alert
            type='info'
            showIcon
            title='Worth a look'
            description={<IssueList issues={warnings} />}
          />
        )}
        <Descriptions
          size='small'
          column={1}
          items={[
            { key: 'matches', label: 'Matches', children: plan.total },
            {
              key: 'days',
              label: 'Days used',
              children: `${daysUsed} of ${plan.days.length}`
            },
            {
              key: 'window',
              label: 'Runs',
              children: getPlayWindow(plan, schedule)
            },
            {
              key: 'generated',
              label: 'Schedule',
              children: !hasSavedItems ? (
                <Tag>Not generated</Tag>
              ) : upToDate ? (
                <Tag color='success'>Up to date</Tag>
              ) : (
                <Tag color='warning'>Out of date</Tag>
              )
            }
          ]}
        />
        {hasSavedItems && !locked ? (
          <Popconfirm
            title='Replace the existing schedule?'
            description='The previously generated schedule items will be deleted and rebuilt from these parameters.'
            okText='Regenerate'
            disabled={!ready}
            onConfirm={onGenerate}
          >
            {generateButton()}
          </Popconfirm>
        ) : (
          generateButton(onGenerate)
        )}
      </Flex>
    </Card>
  );
};
