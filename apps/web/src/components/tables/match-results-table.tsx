import { FC } from 'react';
import { UpgradedTable } from './upgraded-table.js';
import { Match, RESULT_NOT_PLAYED, Team } from '@toa-lib/models';
import { useTeamIdentifierRecord } from 'src/hooks/use-team-identifier.js';
import { DateTime } from 'luxon';

interface Props {
  matches: Match<any>[];
  teams: Team[];
  colored?: boolean;
  disabled?: boolean;
  selected?: (match: Match<any>) => boolean;
  onSelect?: (id: number) => void;
}

export const MatchResultsTable: FC<Props> = ({
  matches,
  teams,
  colored,
  disabled,
  selected,
  onSelect
}) => {
  const identifiers = useTeamIdentifierRecord(teams ?? []);
  const allianceSize = matches[0]?.participants?.length
    ? matches[0].participants.length / 2
    : 3;
  const allianceHeaders = matches[0]?.participants?.length
    ? matches[0].participants?.map((_, i) =>
        i < allianceSize ? `Red ${i + 1}` : `Blue ${i + 1 - allianceSize}`
      )
    : [];
  const handleSelect = (match: Match<any>) => onSelect?.(match.id);
  return (
    <UpgradedTable
      data={matches}
      rowKey={'id'}
      headers={[
        'Name',
        'Field',
        'Time',
        ...allianceHeaders,
        'Red Score',
        'Blue Score'
      ]}
      selected={selected}
      onSelect={disabled ? undefined : handleSelect}
      renderRow={(e) => {
        const participants = e.participants
          ? e.participants?.map((p) => {
            const team = teams?.find((t) => t.teamKey === p.teamKey);
            return team ? identifiers[p.teamKey] : p.teamKey;
          })
          : [];
        return [
          e.name,
          e.fieldNumber,
          DateTime.fromISO(e.scheduledTime).toLocaleString(
            DateTime.DATETIME_SHORT
          ),
          ...participants.map((p, i) => (
            <span
              key={`${e.eventKey}-${e.tournamentKey}-${e.id}-${i}`}
              className={colored ? (i >= allianceSize ? 'blue' : 'red') : undefined}
            >
              {p}
            </span>
          )),
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
      } }    />
  );
};
