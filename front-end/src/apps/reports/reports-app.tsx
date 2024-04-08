import { FC, ReactNode, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PaperLayout from 'src/layouts/PaperLayout';
import TwoColumnHeader from 'src/components/util/Headers/TwoColumnHeader';
import { GeneralReports } from './general-reports';
import { ReportView } from './components/report-view';
import { useRecoilState, useRecoilValue } from 'recoil';
import { TournamentReports } from './tournament-reports';
import {
  currentEventKeyAtom,
  currentTournamentKeyAtom
} from 'src/stores/NewRecoil';
import { useTournamentsForEvent } from 'src/api/use-tournament-data';
import TournamentDropdown from 'src/components/dropdowns/tournament-dropdown';

export const Reports: FC = () => {
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const [tournamentKey, setTournamentKey] = useRecoilState(
    currentTournamentKeyAtom
  );
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
          left={<Typography variant='h4'>Reports</Typography>}
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
      <Box sx={{ padding: (theme) => theme.spacing(3) }}>
        {report ? (
          <ReportView onReturn={handleReturn}>{report}</ReportView>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Typography variant='h4' gutterBottom>
              {tournament?.name} Reports
            </Typography>
            <TournamentReports
              eventKey={eventKey}
              tournamentKey={tournamentKey}
              onGenerate={handleReportUpdate}
            />
            <GeneralReports
              eventKey={eventKey}
              onGenerate={handleReportUpdate}
            />
          </Box>
        )}
      </Box>
    </PaperLayout>
  );
};
