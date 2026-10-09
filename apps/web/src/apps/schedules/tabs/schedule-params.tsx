import { Alert, Card, Col, Empty, Flex, Row } from 'antd';
import {
  ScheduleParams as EventScheduleParams,
  generateScheduleItems,
  getScheduleIssues,
  normalizeScheduleDays,
  planSchedule
} from '@toa-lib/models';
import { FC, useDeferredValue, useMemo, useState } from 'react';
import {
  scheduleApi,
  useScheduleItemsForTournament
} from 'src/api/use-schedule-data.js';
import { useCurrentTournament } from 'src/api/use-tournament-data.js';
import { ScheduleTable } from 'src/components/tables/schedule-table.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { DaysCard } from '../params/days-card.js';
import { MatchFormatCard } from '../params/match-format-card.js';
import { matchesSavedItems } from '../params/match-plan.js';
import { ScheduleSummary } from '../params/schedule-summary.js';
import { useScheduleDraft } from '../params/use-schedule-draft.js';

interface Props {
  eventSchedule?: EventScheduleParams;
  onEventScheduleChange?: (
    eventSchedule: EventScheduleParams
  ) => void | Promise<void>;
  disabled?: boolean;
}

export const ScheduleParams: FC<Props> = ({
  eventSchedule,
  disabled,
  onEventScheduleChange
}) => {
  if (!eventSchedule)
    return <Empty description='Please select a tournament.' />;
  return (
    <ScheduleParamsEditor
      // A fresh editor per tournament, so one tournament's edits can't leak into another.
      key={`${eventSchedule.eventKey}/${eventSchedule.tournamentKey}`}
      saved={eventSchedule}
      locked={disabled}
      save={onEventScheduleChange}
    />
  );
};

interface EditorProps {
  saved: EventScheduleParams;
  locked?: boolean;
  save?: Props['onEventScheduleChange'];
}

const ScheduleParamsEditor: FC<EditorProps> = ({ saved, locked, save }) => {
  const { showSnackbar, showErrorSnackbar } = useSnackbar();
  const tournament = useCurrentTournament();
  const {
    data: savedItems,
    isLoading,
    mutate: mutateSavedItems
  } = useScheduleItemsForTournament(saved.eventKey, saved.tournamentKey);
  const [generating, setGenerating] = useState(false);
  const { draft, status, update, flush } = useScheduleDraft(
    saved,
    (schedule) => save?.(normalizeScheduleDays(schedule)),
    (e) => showErrorSnackbar('Error while saving schedule parameters.', e)
  );

  const plan = useMemo(() => planSchedule(draft), [draft]);
  const issues = useMemo(() => getScheduleIssues(draft, plan), [draft, plan]);
  const ready = !issues.some((issue) => issue.severity === 'error');
  const preview = useMemo(
    () => (ready ? generateScheduleItems(draft, plan) : []),
    [ready, draft, plan]
  );
  // The table can lag a keystroke behind without making the inputs feel slow.
  const shownPreview = useDeferredValue(preview);
  const upToDate = useMemo(
    () =>
      ready && !!savedItems?.length && matchesSavedItems(preview, savedItems),
    [ready, preview, savedItems]
  );
  const hasSavedItems = !!savedItems?.length;
  const disabled = locked || generating;

  const generate = async () => {
    setGenerating(true);
    try {
      // Items come from the saved parameters, so make sure they are saved first.
      if (!(await flush())) return;
      await scheduleApi.delete.items(draft.eventKey, draft.tournamentKey);
      await scheduleApi.create.items(preview);
      await mutateSavedItems(preview, { revalidate: false });
      showSnackbar('Schedule generated.');
    } catch (e) {
      showErrorSnackbar('Error while generating schedule.', e);
    } finally {
      setGenerating(false);
    }
  };

  const shownItems = ready ? shownPreview : (savedItems ?? []);

  return (
    <Flex vertical gap={16}>
      {locked && (
        <Alert
          type='info'
          showIcon
          title='Parameters are locked'
          description='Matches have already been created for this tournament, so the schedule can no longer be changed.'
        />
      )}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Flex vertical gap={16}>
            <MatchFormatCard
              schedule={draft}
              fieldCount={tournament?.fieldCount}
              disabled={disabled}
              onChange={update}
            />
            <DaysCard
              schedule={draft}
              plan={plan}
              issues={issues}
              disabled={disabled}
              onChange={update}
            />
          </Flex>
        </Col>
        <Col xs={24} xl={8}>
          <ScheduleSummary
            schedule={draft}
            plan={plan}
            issues={issues}
            saveStatus={status}
            hasSavedItems={hasSavedItems}
            upToDate={upToDate}
            generating={generating || isLoading}
            locked={locked}
            onGenerate={generate}
            onRetrySave={flush}
          />
        </Col>
      </Row>
      <Card
        title={upToDate || !ready ? 'Current schedule' : 'Schedule preview'}
        size='small'
      >
        {shownItems.length > 0 ? (
          <ScheduleTable items={shownItems} />
        ) : (
          <Empty description='Complete the parameters above to preview the schedule.' />
        )}
      </Card>
    </Flex>
  );
};
