import { FC } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useRecoilValue } from 'recoil';
import { selectedMatchSelector } from 'src/stores/Recoil';

const MatchStatus: FC = () => {
  const selectedMatch = useRecoilValue(selectedMatchSelector);

  const name = selectedMatch ? selectedMatch.matchName : 'No Match Selected';

  return (
    <Paper sx={{ paddingBottom: (theme) => theme.spacing(2), height: '100%' }}>
      <Box sx={{ padding: (theme) => theme.spacing(2) }}>
        <Typography align='center'>{name}</Typography>
      </Box>
      <Divider />
      <Box sx={{ padding: (theme) => theme.spacing(2) }}>
        <Typography align='center' variant='h5'>
          2:30
        </Typography>
      </Box>
    </Paper>
  );
};

export default MatchStatus;
