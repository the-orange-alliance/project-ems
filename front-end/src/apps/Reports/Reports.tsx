import { FC, ReactNode, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PaperLayout from 'src/layouts/PaperLayout';
import TournamentDropdown from 'src/components/Dropdowns/TournamentDropdown';
import TwoColumnHeader from 'src/components/Headers/TwoColumnHeader';
import GeneralReports from './GeneralReports';
import ReportView from './components/ReportView';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  selectedTournamentLevel,
  selectedTournamentType
} from 'src/stores/Recoil';
import TournamentReports from './TournamentReports';

const Reports: FC = () => {
  const [selectedType, setSelectedType] = useRecoilState(
    selectedTournamentLevel
  );
  const tournamentType = useRecoilValue(selectedTournamentType);
  const [report, setReport] = useState<ReactNode | null>(null);

  const handleTournamentChange = (value: number) => {
    setSelectedType(value);
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
              value={selectedType}
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
              {tournamentType} Reports
            </Typography>
            <TournamentReports onGenerate={handleReportUpdate} />
            <GeneralReports onGenerate={handleReportUpdate} />
          </Box>
        )}
      </Box>
    </PaperLayout>
  );
};

export default Reports;
