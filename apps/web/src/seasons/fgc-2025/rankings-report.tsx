import { FC, useMemo } from 'react';
import { Button } from 'antd';
import { RankingsReportProps } from 'src/seasons/index.js';
import { Report } from 'src/apps/report-app/components/report-container.js';
import { mkConfig, generateCsv, download } from 'export-to-csv';
import { EcoEquilibrium } from '@toa-lib/models/seasons';
import { UpgradedTable } from 'src/components/tables/upgraded-table.js';
import { Team } from '@toa-lib/models';

export const RankingsReport: FC<
  RankingsReportProps<EcoEquilibrium.SeasonRanking> & {
    teams?: Team[];
    identifier?: keyof Team;
  }
> = ({ rankings, identifier, teams }) => {
  const teamDisplayMap = useMemo(() => {
    if (!teams || !identifier) return null;
    return new Map<number, string>(
      teams.map((t) => [t.teamKey, String(t[identifier])])
    );
  }, [teams, identifier]);
  const headers = [
    'Rank',
    'Team',
    'Played',
    'Ranking Score',
    'Highest Score',
    'Protection Points'
  ];

  const renderRow = (r: EcoEquilibrium.SeasonRanking) => [
    r.rank,
    teamDisplayMap?.get(r.teamKey) ?? r.teamKey,
    r.played,
    r.rankingScore ?? 0,
    r.highestScore ?? 0,
    r.protectionPoints ?? 0
  ];

  const dataSorted = [...rankings].sort((a, b) => a.rank - b.rank);
  const downloadCSV = () => {
    const csvConfig = mkConfig({ useKeysAsHeaders: true });
    const csv = generateCsv(csvConfig)(
      dataSorted.map((r) => ({
        rank: r.rank,
        team: teamDisplayMap?.get(r.teamKey) ?? r.teamKey,
        played: r.played,
        rankingScore: r.rankingScore ?? 0,
        highestScore: r.highestScore ?? 0,
        protectionPoints: r.protectionPoints ?? 0
      }))
    );
    download(csvConfig)(csv);
  };
  return (
    <>
      <div>
        <Button onClick={downloadCSV} type='primary'>
          Greg CSV
        </Button>
      </div>
      <Report name='Competing Teams'>
        <UpgradedTable
          data={dataSorted}
          headers={headers}
          rowKey={'teamKey' as keyof EcoEquilibrium.SeasonRanking}
          renderRow={renderRow}
        />
      </Report>
    </>
  );
};
