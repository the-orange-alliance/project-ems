import { FC, useCallback } from 'react';
import Button from '@mui/material/Button';

interface Props {
  cardStatus: number;
  onChange: (status: number) => void;
}

const TeamCardStatus: FC<Props> = ({ cardStatus, onChange }) => {
  const toggle = () => {
    onChange(cardStatus >= 2 ? 0 : cardStatus + 1);
  };

  const renderText = useCallback(() => {
    switch (cardStatus) {
      case 0:
        return 'NO CARD';
      case 1:
        return 'YELLOW CARD';
      case 2:
        return 'RED CARD';
      default:
        return 'NO CARD';
    }
  }, [cardStatus]);

  const getClass = () => {
    switch (cardStatus) {
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
