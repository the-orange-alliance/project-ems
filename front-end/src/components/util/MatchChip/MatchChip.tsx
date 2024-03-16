import { FC } from 'react';
import Chip from '@mui/material/Chip';
import { Match } from '@toa-lib/models';

import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface Props {
  match: Match<any> | null | undefined;
}

const MatchChip: FC<Props> = ({ match }) => {
  return (
    <Chip
      icon={match ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
      label={match ? match.name : 'No Match Loaded'}
      color={match ? 'success' : 'error'}
      sx={{ maxWidth: '220px' }}
    />
  );
};

export default MatchChip;
