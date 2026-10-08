import { FC, useMemo, useState } from 'react';
import { Button, Input, Space, Typography } from 'antd';
import { useAtom } from 'jotai';
import { Match, Tournament } from '@toa-lib/models';
import { Report } from './report-container.js';
import { DateTime } from 'luxon';
import { EventTournamentFieldsDropdown } from 'src/components/dropdowns/event-tournament-fields-dropdown.js';
import { mkConfig, generateCsv, download } from 'export-to-csv';
import { UpgradedTable } from 'src/components/tables/upgraded-table.js';
import { cycleTimeFieldGroupsAtom } from 'src/stores/state/ui.js';
import { computeCycleTimes, parseFieldGroups } from './cycle-times.js';

interface Props {
  tournament: Tournament;
  matches: Match<any>[];
}

const toMs = (iso?: string): number => (iso ? Date.parse(iso) : NaN);

const formatTime = (iso?: string): string =>
  iso && Number.isFinite(toMs(iso))
    ? DateTime.fromISO(iso).toLocaleString(DateTime.TIME_WITH_SECONDS)
    : '';

const formatDuration = (ms: number, signed = false): string => {
  if (!Number.isFinite(ms)) return '';
  const totalSeconds = Math.round(Math.abs(ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  const sign = ms < 0 ? '-' : signed && ms > 0 ? '+' : '';
  return `${sign}${minutes}:${seconds}`;
};

export const CycleTimeReport: FC<Props> = ({ tournament, matches }) => {
  const allFields = tournament.fields.map((_, i) => i + 1);
  const [fields, setFields] = useState(allFields);
  const [groupText, setGroupText] = useAtom(cycleTimeFieldGroupsAtom);

  const groups = useMemo(
    () => parseFieldGroups(groupText, tournament.fields.length),
    [groupText, tournament.fields.length]
  );
  // Computed over every field so a filtered view still uses its partner's starts.
  const times = useMemo(
    () => computeCycleTimes(matches, groups),
    [matches, groups]
  );
  const cycleTimesOf = (m: Match<any>) =>
    times.get(m.id) ?? {
      group: String(m.fieldNumber),
      prestartToStart: NaN,
      scheduleVariance: NaN,
      cycle: NaN
    };

  const fieldMatches = matches
    .filter((m) => fields.indexOf(m.fieldNumber) > -1)
    .sort(
      (a, b) =>
        (toMs(a.scheduledTime) || 0) - (toMs(b.scheduledTime) || 0) ||
        a.id - b.id
    );

  const changeFields = (newFields: number[]) => setFields(newFields);

  const downloadCSV = () => {
    const csvConfig = mkConfig({ useKeysAsHeaders: true });
    const csv = generateCsv(csvConfig)(
      fieldMatches.map((m) => {
        const t = cycleTimesOf(m);
        return {
          name: m.name,
          field: m.fieldNumber,
          fieldGroup: t.group,
          scheduled: formatTime(m.scheduledTime),
          prestart: formatTime(m.prestartTime),
          started: formatTime(m.actualStartTime),
          prestartToStart: formatDuration(t.prestartToStart),
          scheduleVariance: formatDuration(t.scheduleVariance, true),
          cycleTime: formatDuration(t.cycle)
        };
      })
    );
    download(csvConfig)(csv);
  };

  const headers = [
    'Name',
    'Field',
    'Field Group',
    'Scheduled',
    'Prestart',
    'Started',
    'Prestart → Start',
    'Start vs Schedule',
    'Cycle Time'
  ];

  const renderRow = (m: Match<any>) => {
    const t = cycleTimesOf(m);
    return [
      m.name,
      m.fieldNumber,
      t.group,
      formatTime(m.scheduledTime),
      formatTime(m.prestartTime),
      formatTime(m.actualStartTime),
      formatDuration(t.prestartToStart),
      formatDuration(t.scheduleVariance, true),
      formatDuration(t.cycle)
    ];
  };

  return (
    <>
      <div className='no-print'>
        <EventTournamentFieldsDropdown
          fields={fields}
          onChange={changeFields}
        />
        <Space direction='vertical' style={{ marginTop: 8, width: '100%' }}>
          <Input
            addonBefore='Field groups'
            placeholder='e.g. 1,2; 3; 4,5'
            value={groupText}
            onChange={(e) => setGroupText(e.target.value)}
            allowClear
          />
          <Typography.Text type='secondary'>
            Separate groups with semicolons. Fields not listed cycle on their
            own. Using: {groups.map((g) => g.join(' + ')).join(' | ')}
          </Typography.Text>
        </Space>
      </div>
      <div>
        <Button onClick={downloadCSV} className='no-print'>
          Download CSV
        </Button>
      </div>
      <Report name={`${tournament.name} Cycle Time Report`}>
        <UpgradedTable
          data={fieldMatches}
          headers={headers}
          rowKey='id'
          renderRow={renderRow}
        />
      </Report>
    </>
  );
};
