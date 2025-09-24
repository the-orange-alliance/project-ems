import { FC } from 'react';
import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button
} from '@mui/material';
import { FeedingTheFuture } from '@toa-lib/models';
import { RankingsReportProps } from 'src/seasons';
import { Report } from 'src/apps/report-app/components/report-container';
import { useTeamIdentifiers } from 'src/hooks/use-team-identifier';
import { mkConfig, generateCsv, download } from 'export-to-csv';

export const RankingsReport: FC<
  RankingsReportProps<FeedingTheFuture.SeasonRanking>
> = ({ rankings }) => {
  const identifiers = useTeamIdentifiers();
  const downloadCSV = () => {
    const csvConfig = mkConfig({ useKeysAsHeaders: true });
    const csv = generateCsv(csvConfig)(
      rankings.map((r) => ({
        rank: r.rank,
        team: identifiers[r.teamKey],
        played: r.played,
        rankingScore: r.rankingScore ?? 0,
        highestScore: r.highestScore ?? 0,
        foodSecuredPoints: r.foodSecuredPoints ?? 0
      }))
    );
    download(csvConfig)(csv);
  };
  return (
    <>
      <div>
        <Button onClick={downloadCSV}>Greg CSV</Button>
      </div>
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
              {rankings
                .sort((a, b) => a.rank - b.rank)
                .map((r) => (
                  <TableRow
                    key={`${r.eventKey}-${r.tournamentKey}-${r.teamKey}`}
                  >
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
    </>
  );
};
