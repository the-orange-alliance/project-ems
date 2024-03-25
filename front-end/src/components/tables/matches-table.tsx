import { Match, Team } from '@toa-lib/models';
import { FC } from 'react';
import UpgradedTable from './UpgradedTable/UpgradedTable';
import { DateTime } from 'luxon';
import { useTeamIdentifierRecord } from 'src/hooks/use-team-identifier';

interface Props {
  matches: Match<any>[];
  teams?: Team[];
}

export const MatchTable: FC<Props> = ({ matches, teams }) => {
  const identifiers = useTeamIdentifierRecord(teams ?? []);
  const allianceSize = matches[0]?.participants?.length
    ? matches[0].participants.length / 2
    : 3;
  const allianceHeaders = matches[0]?.participants?.length
    ? matches[0].participants?.map((_, i) =>
        i < allianceSize ? `Red ${i + 1}` : `Blue ${i + 1 - allianceSize}`
      )
    : [];
  console.log({ match: matches[0], allianceSize, allianceHeaders });
  return (
    <UpgradedTable
      data={matches}
      headers={['Name', 'Field', 'Time', ...allianceHeaders]}
      renderRow={(e) => {
        const participants =
          e.participants?.map((p) => {
            const team = teams?.find((t) => t.teamKey === p.teamKey);
            return team ? identifiers[p.teamKey] : p.teamKey;
          }) ?? [];
        return [
          e.name,
          e.fieldNumber,
          DateTime.fromISO(e.startTime).toLocaleString(DateTime.DATETIME_FULL),
          ...participants
        ];
      }}
    />
  );
};
