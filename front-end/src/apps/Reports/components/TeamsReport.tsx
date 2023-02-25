import { FC } from 'react';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import { Team } from '@toa-lib/models';
import Report from './Report';

interface Props {
  teams: Team[];
}

const TeamsReport: FC<Props> = ({ teams }) => {
  return (
    <Report name='Competing Teams'>
      <TableContainer>
        <Table size='small'>
          <TableHead sx={{ backgroundColor: 'lightgrey' }}>
            <TableRow>
              <TableCell>Team Name (long)</TableCell>
              <TableCell>Team Name (short)</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Country Code</TableCell>
              <TableCell>Flag</TableCell>
              <TableCell>Rookie Year</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {teams.map((t) => (
              <TableRow key={t.teamKey}>
                <TableCell>{t.teamNameLong}</TableCell>
                <TableCell>{t.teamNameShort}</TableCell>
                <TableCell>
                  {[t.city, t.stateProv, t.country]
                    .filter((str) => str.length > 0)
                    .toString()}
                </TableCell>
                <TableCell>{t.countryCode}</TableCell>
                <TableCell>
                  <span
                    className={`flag-icon flag-border flag-icon-${t.countryCode.toLowerCase()}`}
                  />
                </TableCell>
                <TableCell>{t.rookieYear}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Report>
  );
};

export default TeamsReport;
