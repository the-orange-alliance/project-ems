import { FC } from 'react';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import { Match, Team } from '@toa-lib/models';
import Report from './Report';
import moment from 'moment-timezone';
import { useRecoilValue } from 'recoil';
import { teamByTeamKey } from 'src/stores/Recoil';

interface Props {
  matches: Match[];
  identifier?: keyof Team;
}

const MatchReport: FC<Props> = ({ matches, identifier }) => {
  return (
    <Report name='Match Schedule'>
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
            {matches.map((m) => (
              <TableRow key={m.matchKey}>
                <TableCell>{m.matchName}</TableCell>
                <TableCell size='small'>{m.fieldNumber}</TableCell>
                <TableCell>
                  {moment
                    .tz(m.startTime, moment.tz.guess())
                    .format('ddd HH:mm zz')}
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
};

export default MatchReport;
