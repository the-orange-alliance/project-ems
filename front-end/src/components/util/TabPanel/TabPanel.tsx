import { FC } from 'react';
import Box from '@mui/material/Box';

interface Props {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: FC<Props> = ({ children, index, value, ...other }) => {
  return (
    <div role='tabpanel' hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

export default TabPanel;
