import { FC } from 'react';
import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from '@mui/material';
import { FeedingTheFuture } from '@toa-lib/models';
import { RankingsReportProps } from 'src/seasons';
import { Report } from 'src/apps/reports/components/report-container';
import { useTeamIdentifiers } from 'src/hooks/use-team-identifier';

export const RankingsReport: FC<
  RankingsReportProps<FeedingTheFuture.SeasonRanking>
> = ({ rankings }) => {
  const identifiers = useTeamIdentifiers();
  return (
    <Report name='Competing Teams'>
      <TableContainer>
        <Table size='small'>
          <TableHead sx={{ backgroundColor: 'lightgrey' }}>
            <TableRow>
              <TableCell>Rank</TableCell>
              <TableCell>Team</TableCell>
              <TableCell>Played</TableCell>
              <TableCell>Ranking Score</TableCell>
              <TableCell>Highest Score</TableCell>
              <TableCell>Food Secured Points</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rankings.map((r) => (
              <TableRow key={`${r.eventKey}-${r.tournamentKey}-${r.teamKey}`}>
                <TableCell>{r.rank}</TableCell>
                <TableCell>{identifiers[r.teamKey]}</TableCell>
                <TableCell>{r.played}</TableCell>
                <TableCell>{r.rankingScore ?? 0}</TableCell>
                <TableCell>{r.highestScore ?? 0}</TableCell>
                <TableCell>{r.foodSecuredPoints ?? 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Report>
  );
};