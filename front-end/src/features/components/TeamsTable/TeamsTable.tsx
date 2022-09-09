import { FC } from 'react';
import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Tooltip from '@mui/material/Tooltip';
import TableActions from './TableActions';
import { Team } from '@toa-lib/models';

interface Props {
  teams: Team[];
}

const TeamsTable: FC<Props> = ({ teams }) => {
  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader size='small'>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Participant ID</TableCell>
              <TableCell>Name (short)</TableCell>
              <TableCell>Name (long)</TableCell>
              <TableCell>Robot</TableCell>
              <TableCell>Location</TableCell>
              <Tooltip title="Country Code, a team's 2-letter ISO-alpha code.">
                <TableCell>CC</TableCell>
              </Tooltip>
              <TableCell align='center'>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {teams.map((team) => (
              <TableRow key={team.eventParticipantKey} hover>
                <TableCell>{team.teamKey}</TableCell>
                <TableCell>{team.eventParticipantKey}</TableCell>
                <TableCell>{team.teamNameShort}</TableCell>
                <TableCell>{team.teamNameLong}</TableCell>
                <TableCell>{team.robotName}</TableCell>
                <TableCell>
                  {[team.city, team.stateProv, team.country]
                    .filter((str) => str.length > 0)
                    .toString()}
                </TableCell>
                <TableCell>{team.countryCode}</TableCell>
                <TableCell align='center'>
                  <TableActions />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default TeamsTable;
