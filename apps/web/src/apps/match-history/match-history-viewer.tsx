import { FC, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  List,
  Row,
  Select,
  Space,
  Tag,
  Typography
} from 'antd';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { useEventState } from 'src/stores/hooks/use-event-state.js';
import { useAtomValue } from 'jotai';
import { tournamentKeyAtom } from 'src/stores/state/event.js';
import {
  MatchActionEventRow,
  MatchHistorySnapshotRow,
  useMatchHistory
} from 'src/api/use-match-data.js';
import { PageLoader } from 'src/components/loading/page-loader.js';

const AUDIT_FIELDS = new Set([
  'historyId',
  'eventKey',
  'tournamentKey',
  'id',
  'revision',
  'actionType',
  'source',
  'actorId',
  'actorName',
  'clientId',
  'socketId',
  'correlationId',
  'occurredAtUtc'
]);

type DiffEntry = {
  key: string;
  before: unknown;
  after: unknown;
};

type RevisionItem = {
  revision: number;
  occurredAtUtc: string;
  actionType: string;
  actorName?: string;
  source: string;
  diffs: DiffEntry[];
};

const toComparableSnapshot = (
  base: MatchHistorySnapshotRow,
  details?: MatchHistorySnapshotRow
): Record<string, unknown> => {
  const merged = { ...(base ?? {}), ...(details ?? {}) };
  const comparable: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(merged)) {
    if (AUDIT_FIELDS.has(key)) continue;
    comparable[key] = value;
  }
  return comparable;
};

const valuesEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
  }
  return JSON.stringify(a) === JSON.stringify(b);
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '(empty)';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const getDiffs = (
  prev: Record<string, unknown>,
  curr: Record<string, unknown>
): DiffEntry[] => {
  const keys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
  const diffs: DiffEntry[] = [];
  for (const key of keys) {
    const before = prev[key];
    const after = curr[key];
    if (!valuesEqual(before, after)) {
      diffs.push({ key, before, after });
    }
  }
  return diffs.sort((a, b) => a.key.localeCompare(b.key));
};

export const MatchHistoryViewer: FC = () => {
  const {
    loading,
    state: {
      local: { event, tournaments, matches }
    }
  } = useEventState({
    event: true,
    tournaments: true,
    matches: true
  });

  const activeTournamentKey = useAtomValue(tournamentKeyAtom);
  const [selectedTournamentKey, setSelectedTournamentKey] = useState<
    string | undefined
  >(undefined);
  const [selectedMatchId, setSelectedMatchId] = useState<number | undefined>(
    undefined
  );
  const [includeActions, setIncludeActions] = useState(true);

  const sortedTournaments = useMemo(
    () =>
      [...(tournaments ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      ),
    [tournaments]
  );

  useEffect(() => {
    if (selectedTournamentKey) return;
    if (activeTournamentKey) {
      setSelectedTournamentKey(activeTournamentKey);
      return;
    }
    if (sortedTournaments.length > 0) {
      setSelectedTournamentKey(sortedTournaments[0].tournamentKey);
    }
  }, [activeTournamentKey, selectedTournamentKey, sortedTournaments]);

  const tournamentMatches = useMemo(() => {
    if (!selectedTournamentKey) return [];
    return [...(matches ?? [])]
      .filter((m) => m.tournamentKey === selectedTournamentKey)
      .sort((a, b) => a.id - b.id);
  }, [matches, selectedTournamentKey]);

  useEffect(() => {
    if (
      selectedMatchId !== undefined &&
      tournamentMatches.some((m) => m.id === selectedMatchId)
    ) {
      return;
    }
    if (tournamentMatches.length > 0) {
      setSelectedMatchId(tournamentMatches[0].id);
    } else {
      setSelectedMatchId(undefined);
    }
  }, [selectedMatchId, tournamentMatches]);

  const selectedMatch = useMemo(
    () => tournamentMatches.find((m) => m.id === selectedMatchId),
    [tournamentMatches, selectedMatchId]
  );

  const historyKey =
    event?.eventKey && selectedTournamentKey && selectedMatchId !== undefined
      ? {
          eventKey: event.eventKey,
          tournamentKey: selectedTournamentKey,
          id: selectedMatchId
        }
      : null;

  const {
    data: historyData,
    error,
    isLoading,
    mutate
  } = useMatchHistory(historyKey, {
    includeActions,
    limit: 300
  });

  const timeline = useMemo<RevisionItem[]>(() => {
    const base = historyData?.history.base ?? [];
    const details = historyData?.history.details ?? [];
    const detailByRevision = new Map<number, MatchHistorySnapshotRow>();
    for (const row of details) {
      detailByRevision.set(Number(row.revision), row);
    }

    const sortedBase = [...base].sort(
      (a, b) => Number(a.revision) - Number(b.revision)
    );

    const items: RevisionItem[] = [];
    let prevComparable: Record<string, unknown> = {};

    for (const row of sortedBase) {
      const detailRow = detailByRevision.get(Number(row.revision));
      const comparable = toComparableSnapshot(row, detailRow);
      const diffs = getDiffs(prevComparable, comparable);

      items.push({
        revision: Number(row.revision),
        occurredAtUtc: String(row.occurredAtUtc ?? ''),
        actionType: String(row.actionType ?? 'UNKNOWN'),
        actorName:
          typeof row.actorName === 'string' ? row.actorName : undefined,
        source: String(row.source ?? 'unknown'),
        diffs
      });

      prevComparable = comparable;
    }

    return items.reverse();
  }, [historyData]);

  const actions = useMemo(
    () => [...(historyData?.actions ?? [])].reverse(),
    [historyData]
  );

  if (loading) {
    return <PageLoader />;
  }

  return (
    <PaperLayout
      containerWidth='xl'
      title={event ? `${event.eventName} | Match History Viewer` : undefined}
      titleLink={event ? `/${event.eventKey}` : undefined}
      header={
        <Typography.Title level={3}>Match History Viewer</Typography.Title>
      }
      showSettings
    >
      <Space direction='vertical' style={{ width: '100%' }} size={16}>
        <Card>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={8}>
              <Typography.Text strong>Tournament</Typography.Text>
              <Select
                style={{ width: '100%' }}
                value={selectedTournamentKey}
                onChange={(value) => setSelectedTournamentKey(value)}
                options={sortedTournaments.map((t) => ({
                  value: t.tournamentKey,
                  label: `${t.name} (${t.tournamentKey})`
                }))}
              />
            </Col>
            <Col xs={24} md={8}>
              <Typography.Text strong>Match</Typography.Text>
              <Select
                style={{ width: '100%' }}
                value={selectedMatchId}
                onChange={(value) => setSelectedMatchId(value)}
                options={tournamentMatches.map((m) => ({
                  value: m.id,
                  label: `${m.name} (ID ${m.id})`
                }))}
              />
            </Col>
            <Col xs={24} md={8}>
              <Typography.Text strong>Options</Typography.Text>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Select
                  style={{ width: 180 }}
                  value={includeActions ? 'with-actions' : 'snapshots-only'}
                  onChange={(value) =>
                    setIncludeActions(value === 'with-actions')
                  }
                  options={[
                    { value: 'with-actions', label: 'With Action Events' },
                    { value: 'snapshots-only', label: 'Snapshots Only' }
                  ]}
                />
                <Button onClick={() => mutate()} loading={isLoading}>
                  Refresh
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {error && (
          <Alert
            type='error'
            message='Failed to load match history.'
            description={error.message}
            showIcon
          />
        )}

        {!selectedMatch && (
          <Empty description='No matches available for the selected tournament.' />
        )}

        {selectedMatch && (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card
                title={`Snapshot Revisions (${timeline.length})`}
                loading={isLoading}
              >
                {timeline.length === 0 ? (
                  <Empty description='No revisions recorded yet.' />
                ) : (
                  <List
                    dataSource={timeline}
                    renderItem={(item) => (
                      <List.Item>
                        <div style={{ width: '100%' }}>
                          <Space
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              width: '100%'
                            }}
                          >
                            <Space>
                              <Tag color='blue'>{`Revision ${item.revision}`}</Tag>
                              <Tag>{item.actionType}</Tag>
                              <Tag>{item.source}</Tag>
                            </Space>
                            <Typography.Text type='secondary'>
                              {item.occurredAtUtc}
                            </Typography.Text>
                          </Space>
                          <Typography.Paragraph
                            type='secondary'
                            style={{ marginTop: 8, marginBottom: 8 }}
                          >
                            Actor: {item.actorName ?? 'unknown'}
                          </Typography.Paragraph>
                          {item.diffs.length === 0 ? (
                            <Typography.Text type='secondary'>
                              No value changes detected for this revision.
                            </Typography.Text>
                          ) : (
                            <List
                              size='small'
                              dataSource={item.diffs.slice(0, 20)}
                              renderItem={(diff) => (
                                <List.Item>
                                  <Space direction='vertical' size={0}>
                                    <Typography.Text strong>
                                      {diff.key}
                                    </Typography.Text>
                                    <Typography.Text type='secondary'>
                                      {formatValue(diff.before)}
                                      {' -> '}
                                      {formatValue(diff.after)}
                                    </Typography.Text>
                                  </Space>
                                </List.Item>
                              )}
                            />
                          )}
                        </div>
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>

            <Col xs={24} lg={10}>
              <Card
                title={`Action Events (${actions.length})`}
                loading={isLoading}
              >
                {actions.length === 0 ? (
                  <Empty description='No action events recorded yet.' />
                ) : (
                  <List
                    dataSource={actions}
                    renderItem={(action: MatchActionEventRow) => (
                      <List.Item>
                        <Space direction='vertical' size={2}>
                          <Space>
                            <Tag color='purple'>
                              {action.revision === null
                                ? 'Pending'
                                : `Revision ${action.revision}`}
                            </Tag>
                            <Tag>{action.sourceEvent}</Tag>
                          </Space>
                          <Typography.Text>
                            {action.fieldPath ?? '(no field path)'}
                          </Typography.Text>
                          <Typography.Text type='secondary'>
                            {action.oldValueJson ?? '(empty)'}
                            {' -> '}
                            {action.newValueJson ?? '(empty)'}
                          </Typography.Text>
                          <Typography.Text type='secondary'>
                            {action.occurredAtUtc}
                          </Typography.Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>
          </Row>
        )}
      </Space>
    </PaperLayout>
  );
};
