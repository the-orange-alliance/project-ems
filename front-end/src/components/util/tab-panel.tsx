import { FC } from 'react';
import Box from '@mui/material/Box';

interface Props {
  children?: React.ReactNode;
  index: number;
  value: number;
  noPadding?: boolean;
}

export const TabPanel: FC<Props> = ({
  children,
  index,
  value,
  noPadding,
  ...other
}) => {
  return (
    <div role='tabpanel' hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: noPadding ? 1 : 3 }}>{children}</Box>}
    </div>
  );
};
