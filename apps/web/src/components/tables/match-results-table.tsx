import { FC, useCallback, useMemo } from 'react';
import { UpgradedTable } from './upgraded-table.js';
import { Match, RESULT_NOT_PLAYED, Team } from '@toa-lib/models';
import { useTeamIdentifierRecord } from 'src/hooks/use-team-identifier.js';
import { DateTime } from 'luxon';
import { Checkbox } from 'antd';

// Name, Field, Time, then each team column, then Uploaded and the two scores.
const fixedWidths = { name: 170, field: 70, time: 170, team: 150, result: 100 };

interface Props {
  matches: Match<any>[];
  teams: Team[];
  colored?: boolean;
  disabled?: boolean;
  loading?: boolean;
  /** Renders only the visible rows; needs a numeric `scroll.y`. */
  virtual?: boolean;
  scroll?: { x?: number | string; y?: number | string };
  selected?: (match: Match<any>) => boolean;
  onSelect?: (id: number) => void;
}

export const MatchResultsTable: FC<Props> = ({
  matches,
  teams,
  colored,
  disabled,
  loading,
  virtual,
  scroll,
  selected,
  onSelect
}) => {
  const identifiers = useTeamIdentifierRecord(teams ?? []);
  const participantCount = matches[0]?.participants?.length ?? 0;
  const allianceSize = participantCount ? participantCount / 2 : 3;
  const allianceHeaders = Array.from({ length: participantCount }, (_, i) =>
    i < allianceSize ? `Red ${i + 1}` : `Blue ${i + 1 - allianceSize}`
  );
  const widths = useMemo(
    () => [
      fixedWidths.name,
      fixedWidths.field,
      fixedWidths.time,
      ...Array<number>(participantCount).fill(fixedWidths.team),
      fixedWidths.result,
      fixedWidths.result,
      fixedWidths.result
    ],
    [participantCount]
  );
  const handleSelect = (match: Match<any>) => onSelect?.(match.id);
  const renderRow = useCallback(
    (e: Match<any>) => {
      const participants = (e.participants ?? []).map(
        (p) => identifiers[p.teamKey] ?? p.teamKey
      );
      return [
        e.name,
        e.fieldNumber,
        DateTime.fromISO(e.scheduledTime).toLocaleString(
          DateTime.DATETIME_SHORT
        ),
        ...participants.map((p, i) => (
          <span
            key={`${e.eventKey}-${e.tournamentKey}-${e.id}-${i}`}
            className={
              colored ? (i >= allianceSize ? 'blue' : 'red') : undefined
            }
          >
            {p}
          </span>
        )),
        <span key={`${e.eventKey}-${e.tournamentKey}-${e.id}-uploaded`}>
          <Checkbox checked={!!e.uploaded} disabled />
        </span>,
        <span
          key={`${e.eventKey}-${e.tournamentKey}-${e.id}`}
          className={colored ? 'red' : ''}
        >
          {e.result > RESULT_NOT_PLAYED ? e.redScore : '--'}
        </span>,
        <span
          key={`${e.eventKey}-${e.tournamentKey}-${e.id}`}
          className={colored ? 'blue' : ''}
        >
          {e.result > RESULT_NOT_PLAYED ? e.blueScore : '--'}
        </span>
      ];
    },
    [identifiers, colored, allianceSize]
  );
  return (
    <UpgradedTable
      data={matches}
      rowKey='id'
      headers={[
        'Name',
        'Field',
        'Time',
        ...allianceHeaders,
        'Uploaded',
        'Red Score',
        'Blue Score'
      ]}
      widths={virtual ? widths : undefined}
      virtual={virtual}
      loading={loading}
      selected={selected}
      onSelect={disabled ? undefined : handleSelect}
      disable={disabled}
      scroll={scroll}
      renderRow={renderRow}
    />
  );
};
