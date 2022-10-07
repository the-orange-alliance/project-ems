import { FC } from 'react';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import { Ranking, Team } from '@toa-lib/models';
import Report from './Report';

interface Props {
  rankings: Ranking[];
  identifier?: keyof Team;
}

const RankingReport: FC<Props> = ({ rankings, identifier }) => {
  return (
    <Report name='Competing Teams'>
      <TableContainer>
        <Table size='small'>
          <TableHead sx={{ backgroundColor: 'lightgrey' }}>
            <TableRow>
              <TableCell>Rank</TableCell>
              <TableCell>Team</TableCell>
              <TableCell>Record (W-L-T)</TableCell>
              <TableCell>Ranking Score</TableCell>
              <TableCell>Highest Score</TableCell>
              <TableCell>Carbon Points</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rankings.map((r) => (
              <TableRow key={r.rankKey}>
                <TableCell>{r.rank}</TableCell>
                <TableCell>
                  {identifier && r.team ? r.team[identifier] : r.teamKey}
                </TableCell>
                <TableCell>{`${r.wins}-${r.losses}-${r.ties}`}</TableCell>
                <TableCell>{(r as any).rankingScore}</TableCell>
                <TableCell>{(r as any).highestScore}</TableCell>
                <TableCell>{(r as any).carbonPoints}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Report>
  );
};

export default RankingReport;
