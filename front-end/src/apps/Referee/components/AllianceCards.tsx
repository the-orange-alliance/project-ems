import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

const AllianceCards: FC = () => {
  const navigate = useNavigate();

  const openRed = () => navigate('/referee/red');
  const openBlue = () => navigate('/referee/blue');
  const openHead = () => navigate('/referee/head');
  const openScoreKeeper = () => navigate('/referee/scorekeeper');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
        <Button
          fullWidth
          variant='contained'
          className='black-bg-imp'
          sx={{ height: '10em' }}
          onClick={openHead}
        >
          Head Referee
        </Button>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
        <Button
          fullWidth
          variant='contained'
          className='red-bg-imp'
          sx={{ height: '30em' }}
          onClick={openRed}
        >
          Red Alliance
        </Button>
        <Button
          fullWidth
          variant='contained'
          className='blue-bg-imp'
          sx={{ height: '30em' }}
          onClick={openBlue}
        >
          Blue Alliance
        </Button>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
        <Button
          fullWidth
          variant='contained'
          className='yellow-bg-imp'
          sx={{ height: '10em' }}
          onClick={openScoreKeeper}
        >
          Score Keeper
        </Button>
      </Box>
    </Box>
  );
};

export default AllianceCards;
