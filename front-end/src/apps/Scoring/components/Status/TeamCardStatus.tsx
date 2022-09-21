import { FC, useState, useCallback } from 'react';
import Button from '@mui/material/Button';

const TeamCardStatus: FC = () => {
  const [state, setState] = useState(0);

  const toggle = () => {
    setState((prev) => (prev >= 2 ? 0 : prev + 1));
  };

  const renderText = useCallback(() => {
    switch (state) {
      case 0:
        return 'NO CARD';
      case 1:
        return 'YELLOW CARD';
      case 2:
        return 'RED CARD';
      default:
        return 'NO CARD';
    }
  }, [state]);

  const getClass = () => {
    switch (state) {
      case 0:
        return 'no-card';
      case 1:
        return 'yellow-card';
      case 2:
        return 'red-card';
      default:
        return 'no-card';
    }
  };

  return (
    <Button
      variant='contained'
      fullWidth
      onClick={toggle}
      className={getClass()}
    >
      {renderText()}
    </Button>
  );
};

export default TeamCardStatus;
