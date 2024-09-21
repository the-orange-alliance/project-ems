import { FC, useMemo } from 'react';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import { Match, Team } from '@toa-lib/models';
import { Report } from './report-container';
import { DateTime } from 'luxon';

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

  return (
    <>
      {teams.map((t) => {
        return (
          <Report
            key={t.teamKey}
            name={`${t.teamNameLong} Match Schedule`}
            pagebreak
          >
            <TableContainer>
              <Table size='small'>
                <TableHead sx={{ backgroundColor: 'lightgrey' }}>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell size='small'>Field</TableCell>
                    <TableCell>Time</TableCell>
                    {matches?.[0]?.participants?.map((p, i) => (
                      <TableCell key={`robot-${i}`}>
                        {i < allianceSize
                          ? `Red ${i + 1}`
                          : `Blue ${i + 1 - allianceSize}`}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teamsMap.get(t.teamKey)?.map((m) => (
                    <TableRow key={`${t.teamKey}-${m.id}`}>
                      <TableCell>{m.name}</TableCell>
                      <TableCell size='small'>{m.fieldNumber}</TableCell>
                      <TableCell>
                        {DateTime.fromISO(m.scheduledTime).toLocaleString(
                          DateTime.DATETIME_FULL
                        )}
                      </TableCell>
                      {m.participants?.map((p) => {
                        const team = teams.find((t) => t.teamKey === p.teamKey);
                        return (
                          <TableCell key={`${p.id}-${p.station}`} size='small'>
                            {identifier && team ? team[identifier] : p.teamKey}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Report>
        );
      })}
    </>
  );
};
