import { ChangeEvent, FC } from 'react';
import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Tooltip from '@mui/material/Tooltip';
import { useRecoilState, useRecoilValue } from 'recoil';
import { teamsAtom, teamsInCurrentSchedule } from 'src/stores/Recoil';
import { Checkbox } from '@mui/material';

const TeamSelectionTable: FC = () => {
  const teams = useRecoilValue(teamsAtom);
  const [scheduledTeams, setScheduledTeams] = useRecoilState(
    teamsInCurrentSchedule
  );

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Participating</TableCell>
              <TableCell>ID</TableCell>
              <TableCell>Participant ID</TableCell>
              <TableCell>Name (short)</TableCell>
              <TableCell>Name (long)</TableCell>
              <TableCell>Robot</TableCell>
              <TableCell>Location</TableCell>
              <Tooltip title="Country Code, a team's 2-letter ISO-alpha code.">
                <TableCell>CC</TableCell>
              </Tooltip>
            </TableRow>
          </TableHead>
          <TableBody>
            {teams.map((team) => {
              const toggle = (event: ChangeEvent<HTMLInputElement>) => {
                setScheduledTeams((prev) =>
                  event.target.checked
                    ? [...prev, team]
                    : prev.filter((t) => t.teamKey !== team.teamKey)
                );
              };

              return (
                <TableRow key={team.eventParticipantKey} hover>
                  <TableCell>
                    <Checkbox
                      checked={
                        typeof scheduledTeams.find(
                          (t) => t.teamKey === team.teamKey
                        ) !== 'undefined'
                      }
                      onChange={toggle}
                    />
                  </TableCell>
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
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default TeamSelectionTable;
