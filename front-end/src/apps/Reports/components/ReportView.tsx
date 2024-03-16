import { FC, ReactNode, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ViewReturn from 'src/components/buttons/ViewReturn/ViewReturn';

interface Props {
  onReturn: () => void;
  children?: ReactNode;
}

const ReportView: FC<Props> = ({ onReturn, children }) => {
  const reportRef = useRef(null);
  const handlePrint = useReactToPrint({
    content: () => reportRef.current
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <ViewReturn title='Reports' onClick={onReturn} />
        <Button variant='contained' onClick={handlePrint}>
          Print Report
        </Button>
      </Box>
      <Box ref={reportRef}>{children}</Box>
    </Box>
  );
};

export default ReportView;
