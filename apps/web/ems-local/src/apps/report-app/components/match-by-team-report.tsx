import { FC, useMemo } from 'react';
import { Match, Team } from '@toa-lib/models';
import { Report } from './report-container.js';
import { DateTime } from 'luxon';
import { UpgradedTable } from 'src/components/tables/upgraded-table.js';

interface Props {
  teams: Team[];
  matches: Match<any>[];
  identifier?: keyof Team;
}

export const MatchByTeamReport: FC<Props> = ({
  teams,
  matches,
  identifier
}) => {
  const allianceSize = matches?.[0]?.participants?.length
    ? matches[0].participants.length / 2
    : 3;

  const teamsMap: Map<number, Match<any>[]> = useMemo(() => {
    const newMap: Map<number, Match<any>[]> = new Map();
    for (const match of matches) {
      if (!match.participants) continue;
      for (const participant of match.participants) {
        const oldMatches = newMap.get(participant.teamKey) || [];
        if (oldMatches.length <= 0) {
          newMap.set(participant.teamKey, []);
        }
        newMap.set(participant.teamKey, [...oldMatches, match]);
      }
    }
    return newMap;
  }, [teams, matches]);

  // Dynamic headers based on alliance size
  const headers = [
    'Name',
    'Field',
    'Time',
    ...Array.from({ length: allianceSize }, (_, i) => `Red ${i + 1}`),
    ...Array.from({ length: allianceSize }, (_, i) => `Blue ${i + 1}`)
  ];

  const renderRow = (match: Match<any>) => {
    const baseData = [
      match.name,
      match.fieldNumber,
      DateTime.fromISO(match.scheduledTime).toLocaleString(
        DateTime.DATETIME_FULL
      )
    ];

    // Add participant data
    const participantData = Array(allianceSize * 2).fill('');
    match.participants?.forEach((p: any, index: number) => {
      const team = teams.find((t) => t.teamKey === p.teamKey);
      const teamDisplay =
        identifier && team ? team[identifier] : p.teamKey.toString();
      participantData[index] = teamDisplay;
    });

    return [...baseData, ...participantData];
  };

  return (
    <>
      {teams.map((t) => {
        const teamMatches = teamsMap.get(t.teamKey) || [];

        return (
          <Report
            key={t.teamKey}
            name={`${t.teamNameLong} Match Schedule`}
            pagebreak
          >
            <UpgradedTable
              data={teamMatches}
              headers={headers}
              rowKey='id'
              renderRow={renderRow}
            />
          </Report>
        );
      })}
    </>
  );
};
