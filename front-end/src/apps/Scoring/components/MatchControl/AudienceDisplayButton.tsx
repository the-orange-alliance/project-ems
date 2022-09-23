import { FC } from 'react';
import Button from '@mui/material/Button';
import { useButtonState } from '../../util/ButtonState';
import { setDisplays } from 'src/api/SocketProvider';

const AudienceDisplayButton: FC = () => {
  const { audienceDisplayEnabled } = useButtonState();

  const updateDisplays = () => {
    setDisplays();
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
