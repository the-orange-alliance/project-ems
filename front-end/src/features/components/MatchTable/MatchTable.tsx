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

interface Props {
  matches: Match[];
}

const MatchTable: FC<Props> = ({ matches }) => {
  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Field</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Red 1</TableCell>
              <TableCell>Red 2</TableCell>
              <TableCell>Red 3</TableCell>
              <TableCell>Blue 1</TableCell>
              <TableCell>Blue 2</TableCell>
              <TableCell>Blue 3</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {matches.map((match) => {
              return (
                <TableRow key={match.matchKey} hover>
                  <TableCell>{match.matchName}</TableCell>
                  <TableCell>{match.fieldNumber}</TableCell>
                  <TableCell>
                    {DateTime.fromISO(match.startTime).toLocaleString(
                      DateTime.DATETIME_FULL
                    )}
                  </TableCell>
                  <TableCell>{match.participants?.[0].teamKey}</TableCell>
                  <TableCell>{match.participants?.[1].teamKey}</TableCell>
                  <TableCell>{match.participants?.[2].teamKey}</TableCell>
                  <TableCell>{match.participants?.[3].teamKey}</TableCell>
                  <TableCell>{match.participants?.[4].teamKey}</TableCell>
                  <TableCell>{match.participants?.[5].teamKey}</TableCell>
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
