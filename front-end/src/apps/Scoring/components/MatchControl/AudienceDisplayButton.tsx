import { FC } from 'react';
import Button from '@mui/material/Button';
import { useButtonState } from '../../util/ButtonState';

const AudienceDisplayButton: FC = () => {
  const { audienceDisplayEnabled } = useButtonState();

  const updateDisplays = () => {
    console.log('hah');
  };

  return (
    <Button
      disabled={!audienceDisplayEnabled}
      color='info'
      fullWidth
      variant='contained'
      onClick={updateDisplays}
    >
      Set Displays
    </Button>
  );
};

export default AudienceDisplayButton;
