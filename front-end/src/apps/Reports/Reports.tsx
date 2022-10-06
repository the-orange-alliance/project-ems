import { FC, ReactNode, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PaperLayout from 'src/layouts/PaperLayout';
import TournamentDropdown from 'src/components/Dropdowns/TournamentDropdown';
import TwoColumnHeader from 'src/components/Headers/TwoColumnHeader';
import { TEST_LEVEL } from '@toa-lib/models';
import GeneralReports from './GeneralReports';
import ReportView from './components/ReportView';

const Reports: FC = () => {
  const [selectedType, setSelectedType] = useState(TEST_LEVEL);
  const [report, setReport] = useState<ReactNode | null>(null);

  const handleTournamentChange = (value: number) => setSelectedType(value);
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
          <>
            <GeneralReports onGenerate={handleReportUpdate} />
          </>
        )}
      </Box>
    </PaperLayout>
  );
};

export default Reports;
