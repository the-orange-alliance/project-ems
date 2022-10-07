import { FC } from 'react';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import { DATE_FORMAT_MIN_SHORT, Match, Team } from '@toa-lib/models';
import Report from './Report';
import moment from 'moment';
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
            {matches.map((m) => (
              <TableRow key={m.matchKey}>
                <TableCell>{m.matchName}</TableCell>
                <TableCell>{m.fieldNumber}</TableCell>
                <TableCell>
                  {moment(m.startTime).format(DATE_FORMAT_MIN_SHORT)}
                </TableCell>
                {m.participants?.map((p) => {
                  const team = useRecoilValue(teamByTeamKey(p.teamKey));
                  return (
                    <TableCell key={p.matchParticipantKey}>
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
