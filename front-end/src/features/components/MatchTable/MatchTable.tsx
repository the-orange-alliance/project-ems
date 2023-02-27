import { FC } from 'react';
import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import { Match } from '@toa-lib/models';
import { DateTime } from 'luxon';
import { useRecoilValue } from 'recoil';
import { teamsAtom } from 'src/stores/Recoil';
import { teamIdentifierAtom } from 'src/stores/NewRecoil';

interface Props {
  matches: Match<any>[];
}

const MatchTable: FC<Props> = ({ matches }) => {
  const identifier = useRecoilValue(teamIdentifierAtom);
  const teams = useRecoilValue(teamsAtom);
  const allianceSize = matches?.[0]?.participants?.length
    ? matches[0].participants.length / 2
    : 3;
  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Field</TableCell>
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
            {matches.map((match) => {
              return (
                <TableRow key={match.name} hover>
                  <TableCell>{match.name}</TableCell>
                  <TableCell>{match.fieldNumber}</TableCell>
                  <TableCell>
                    {DateTime.fromISO(match.startTime).toLocaleString(
                      DateTime.DATETIME_FULL
                    )}
                  </TableCell>
                  {match.participants?.map((p) => {
                    const team = teams.find((t) => t.teamKey === p.teamKey);
                    return (
                      <TableCell key={`${match.id}-${p.teamKey}`}>
                        {team ? team[identifier] : p.teamKey}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default MatchTable;
