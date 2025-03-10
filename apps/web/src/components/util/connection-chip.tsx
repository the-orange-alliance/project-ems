import { FC } from 'react';
import Chip from '@mui/material/Chip';
import { useSocket } from 'src/api/use-socket';

import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export const ConnectionChip: FC = () => {
  const [, connected] = useSocket();

  return (
    <Chip
      icon={connected ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
      label={connected ? 'Connected' : 'Not Connected'}
      color={connected ? 'success' : 'error'}
    />
  );
};
