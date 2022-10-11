import { FC, useMemo } from 'react';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import { Match, Team } from '@toa-lib/models';
import Report from './Report';
import { DateTime } from 'luxon';
import { useRecoilValue } from 'recoil';
import { teamByTeamKey } from 'src/stores/Recoil';

interface Props {
  teams: Team[];
  matches: Match[];
  identifier?: keyof Team;
}

const MatchByTeamReport: FC<Props> = ({ teams, matches, identifier }) => {
  const teamsMap: Map<number, Match[]> = useMemo(() => {
    const newMap: Map<number, Match[]> = new Map();
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
                    <TableCell size='small'>Red 1</TableCell>
                    <TableCell size='small'>Red 2</TableCell>
                    <TableCell size='small'>Red 3</TableCell>
                    <TableCell size='small'>Blue 1</TableCell>
                    <TableCell size='small'>Blue 2</TableCell>
                    <TableCell size='small'>Blue 3</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teamsMap.get(t.teamKey)?.map((m) => (
                    <TableRow key={`${t.teamKey}-${m.matchKey}`}>
                      <TableCell>{m.matchName}</TableCell>
                      <TableCell size='small'>{m.fieldNumber}</TableCell>
                      <TableCell>
                        {DateTime.fromISO(m.startTime).toLocaleString(
                          DateTime.DATETIME_FULL
                        )}
                      </TableCell>
                      {m.participants?.map((p) => {
                        const team = useRecoilValue(teamByTeamKey(p.teamKey));
                        return (
                          <TableCell key={p.matchParticipantKey} size='small'>
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

export default MatchByTeamReport;
