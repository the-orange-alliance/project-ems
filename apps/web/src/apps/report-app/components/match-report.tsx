import { FC, useState } from 'react';
import { Button } from 'antd';
import { Match, ScheduleItem, Team, Tournament } from '@toa-lib/models';
import { Report } from './report-container.js';
import { DateTime } from 'luxon';
import { EventTournamentFieldsDropdown } from 'src/components/dropdowns/event-tournament-fields-dropdown.js';
import { mkConfig, generateCsv, download } from 'export-to-csv';
import { UpgradedTable } from 'src/components/tables/upgraded-table.js';

interface Props {
  tournament: Tournament;
  matches: Match<any>[];
  teams: Team[];
  items: ScheduleItem[];
  identifier?: keyof Team;
}

export const MatchReport: FC<Props> = ({
  tournament,
  matches,
  teams,
  items,
  identifier
}) => {
  const allFields = tournament.fields.map((_, i) => i + 1);
  const [fields, setFields] = useState(allFields);

  const fieldMatches = matches.filter(
    (m) => fields.indexOf(m.fieldNumber) > -1
  );

  // Schedule items are named "<type> Match N" while matches are named
  // "<tournament name> Match N", so they can only be joined on the trailing
  // match number, not the full name (BUG-025).
  const matchNumberOf = (name?: string): number | null => {
    const found = /(\d+)\s*$/.exec(name ?? '');
    return found ? parseInt(found[1], 10) : null;
  };
  const matchForItem = (itemName?: string) => {
    const n = matchNumberOf(itemName);
    return n === null
      ? undefined
      : fieldMatches.find((m) => matchNumberOf(m.name) === n);
  };
  const allianceSize = matches?.[0]?.participants?.length
    ? matches[0].participants.length / 2
    : 3;
  const changeFields = (newFields: number[]) => setFields(newFields);
  const downloadCSV = () => {
    const csvConfig = mkConfig({ useKeysAsHeaders: true });
    const csv = generateCsv(csvConfig)(
      fieldMatches.map((m) => ({
        name: m.name,
        field: m.fieldNumber,
        time: DateTime.fromISO(m.scheduledTime).toLocaleString(
          DateTime.DATETIME_FULL
        ),
        ...m.participants?.reduce(
          (acc, p, i) => ({
            ...acc,
            [i < allianceSize
              ? `Red ${i + 1}`
              : `Blue ${i + 1 - allianceSize}`]: teams.find(
              (t) => t.teamKey === p.teamKey
            )?.teamNameShort
          }),
          {}
        )
      }))
    );
    download(csvConfig)(csv);
  };

  // Prepare data for UpgradedTable. Fall back to the matches themselves when a
  // tournament has no stored schedule items, so the report is never empty when
  // matches exist.
  const source =
    items.length > 0
      ? items
      : fieldMatches.map((m) => ({
          id: m.id,
          name: m.name,
          isMatch: true
        }));
  const tableData = source
    .filter((i: any) => !i.isMatch || matchForItem(i.name))
    .map((i: any, index) => ({
      id: i.id,
      isMatch: i.isMatch,
      match: matchForItem(i.name),
      item: i,
      tableIndex: index
    }));

  // Dynamic headers based on alliance size
  const headers = [
    'Name',
    'Field',
    'Time',
    ...Array.from({ length: allianceSize }, (_, i) => `Red ${i + 1}`),
    ...Array.from({ length: allianceSize }, (_, i) => `Blue ${i + 1}`)
  ];

  const renderRow = (row: any) => {
    const { isMatch, match: m, item: i } = row;

    if (!isMatch) {
      // For non-match items (breaks, etc.), span across all columns
      return [i.name, '', '', ...Array(allianceSize * 2).fill('')];
    }

    const baseData = [
      m?.name || '',
      m?.fieldNumber || '',
      m?.scheduledTime
        ? DateTime.fromISO(m.scheduledTime).toLocaleString(
            DateTime.DATETIME_FULL
          )
        : ''
    ];

    // Add participant data
    const participantData = Array(allianceSize * 2).fill('');
    m?.participants?.forEach((p: any, index: number) => {
      const team = teams.find((t) => t.teamKey === p.teamKey);
      const teamDisplay =
        identifier && team ? team[identifier] : team?.teamKey || '';
      const surrogateMarker = p.surrogate ? '*' : '';
      participantData[index] = `${teamDisplay}${surrogateMarker}`;
    });

    return [...baseData, ...participantData];
  };

  return (
    <>
      <div className='no-print'>
        <EventTournamentFieldsDropdown
          fields={fields}
          onChange={changeFields}
        />
      </div>
      <div>
        <Button onClick={downloadCSV} className='no-print'>
          Download CSV
        </Button>
      </div>
      <Report name={`${tournament.name} Match Schedule`}>
        <UpgradedTable
          data={tableData}
          headers={headers}
          rowKey='tableIndex'
          renderRow={renderRow}
        />
      </Report>
    </>
  );
};
