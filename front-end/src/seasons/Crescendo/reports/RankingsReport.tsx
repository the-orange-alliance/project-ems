import { FC } from 'react';
import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from '@mui/material';
import { Crescendo } from '@toa-lib/models';
import { RankingsReportProps } from 'src/seasons';
import { Report } from 'src/apps/reports/components/report-container';
import { useTeamIdentifiers } from 'src/hooks/use-team-identifier';

export const RankingsReport: FC<
  RankingsReportProps<Crescendo.SeasonRanking>
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
              <TableCell>Coopertition</TableCell>
              <TableCell>Match Points</TableCell>
              <TableCell>Auto Points</TableCell>
              <TableCell>Stage Points</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rankings.map((r) => (
              <TableRow key={`${r.eventKey}-${r.tournamentKey}-${r.teamKey}`}>
                <TableCell>{r.rank}</TableCell>
                <TableCell>{identifiers[r.teamKey]}</TableCell>
                <TableCell>{r.played}</TableCell>
                <TableCell>{r.rankingScore ?? 0}</TableCell>
                <TableCell>{r.avgCoopertitionPoints ?? 0}</TableCell>
                <TableCell>{r.avgAllianceMatchPoints ?? 0}</TableCell>
                <TableCell>{r.avgAllianceAutoPoints ?? 0}</TableCell>
                <TableCell>{r.avgAllianceStagePoints ?? 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Report>
  );
};
