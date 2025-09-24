import { FC, ReactNode, useState } from 'react';
import { Typography, Space } from 'antd';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { TwoColumnHeader } from 'src/components/util/two-column-header.js';
import { GeneralReports } from './general-reports.js';
import { ReportView } from './components/report-view.js';
import { useAtom, useAtomValue } from 'jotai';
import { TournamentReports } from './tournament-reports.js';
import { eventKeyAtom, tournamentKeyAtom } from 'src/stores/state/event.js';
import { useTournamentsForEvent } from 'src/api/use-tournament-data.js';
import TournamentDropdown from 'src/components/dropdowns/tournament-dropdown.js';

export const Reports: FC = () => {
  const eventKey = useAtomValue(eventKeyAtom);
  const [tournamentKey, setTournamentKey] = useAtom(tournamentKeyAtom);
  const { data: tournaments } = useTournamentsForEvent(eventKey);
  const tournament = tournaments?.find(
    (t) => t.tournamentKey === tournamentKey
  );
  const [report, setReport] = useState<ReactNode | null>(null);

  const handleTournamentChange = (tournamentKey: string) => {
    setTournamentKey(tournamentKey);
    setReport(null);
  };
  const handleReportUpdate = (c: ReactNode) => {
    setReport(c);
  };
  const handleReturn = () => setReport(null);

  return (
    <PaperLayout
      containerWidth='xl'
      header={
        <TwoColumnHeader
          left={<Typography.Title level={4}>Reports</Typography.Title>}
          right={
            <TournamentDropdown
              tournaments={tournaments}
              value={tournamentKey}
              onChange={handleTournamentChange}
            />
          }
        />
      }
    >
      <div style={{ padding: '24px' }}>
        {report ? (
          <ReportView onReturn={handleReturn}>{report}</ReportView>
        ) : (
          <Space direction='vertical' size='large' style={{ width: '100%' }}>
            <Typography.Title level={4}>
              {tournament?.name} Reports
            </Typography.Title>
            {!tournamentKey && <div>Please select a tournament first.</div>}
            {tournamentKey && (
              <TournamentReports
                eventKey={eventKey}
                tournamentKey={tournamentKey}
                onGenerate={handleReportUpdate}
              />
            )}
            <Typography.Title level={4}>General Reports</Typography.Title>
            <GeneralReports
              eventKey={eventKey}
              onGenerate={handleReportUpdate}
            />
          </Space>
        )}
      </div>
    </PaperLayout>
  );
};
