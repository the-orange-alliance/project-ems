import { FC } from 'react';
import UpgradedTable from './UpgradedTable/UpgradedTable';
import { Match, Team } from '@toa-lib/models';
import { useTeamIdentifierRecord } from 'src/hooks/use-team-identifier';
import { DateTime } from 'luxon';

interface Props {
  matches: Match<any>[];
  teams: Team[];
  selected?: (match: Match<any>) => boolean;
  onSelect?: (id: number) => void;
}

export const MatchResultsTable: FC<Props> = ({
  matches,
  teams,
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
      headers={[
        'Name',
        'Field',
        'Time',
        ...allianceHeaders,
        'Red Score',
        'Blue Score'
      ]}
      selected={selected}
      onSelect={handleSelect}
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
          DateTime.fromISO(e.startTime).toLocaleString(DateTime.DATETIME_SHORT),
          ...participants,
          e.redScore,
          e.blueScore
        ];
      }}
    />
  );
};
