import { Button } from 'antd';
import { FC, useCallback } from 'react';

interface Props {
  cardStatus: number;
  disabled?: boolean;
  onChange: (status: number) => void;
}

export const ParticipantCardStatus: FC<Props> = ({
  cardStatus,
  disabled,
  onChange
}) => {
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
      type='default'
      block
      onClick={toggle}
      disabled={disabled}
      className={getClass()}
      style={{ fontWeight: 600 }}
    >
      {renderText()}
    </Button>
  );
};

export const FGCParticipantCardStatus: FC<Props> = ({
  cardStatus,
  disabled,
  onChange
}) => {
  const toggle = () => {
    onChange(cardStatus >= 3 ? 0 : cardStatus + 1);
  };

  const renderText = useCallback(() => {
    switch (cardStatus) {
      case 0:
        return 'NO CARD';
      case 1:
        return 'YELLOW CARD';
      case 2:
        return 'RED CARD';
      case 3:
        return 'WHITE CARD';
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
      case 3:
        return 'white-card';
      default:
        return 'no-card';
    }
  };
  return (
    <Button
      type='default'
      block
      onClick={toggle}
      disabled={disabled}
      className={getClass()}
      style={{ fontWeight: 600 }}
    >
      {renderText()}
    </Button>
  );
};
