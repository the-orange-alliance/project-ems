import { FC, ReactNode } from 'react';
import Box from '@mui/material/Box';

const AllianceCard: FC<{ children: ReactNode }> = ({ children }) => {
  return <Box sx={{ width: '100%', height: '50vh' }}>{children}</Box>;
};

const AllianceCards: FC = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'row' }}>
      <AllianceCard>Red Alliance</AllianceCard>
      <AllianceCard>Blue Alliance</AllianceCard>
    </Box>
  );
};

export default AllianceCards;
