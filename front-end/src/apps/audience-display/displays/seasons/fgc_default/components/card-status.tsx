import { FC, useMemo } from 'react';
import YELLOW_CARD from '../assets/penalty-yellow-card.png';
import RED_CARD from '../assets/penalty-red-card.png';
import styled from '@emotion/styled';

const Image = styled.img`
  max-height: 100%;
  width: auto;
`;

export const CardStatus: FC<{ cardStatus: number }> = ({ cardStatus }) => {
  const img = useMemo(() => {
    switch (cardStatus) {
      case 0:
        return '';
      case 1:
        return YELLOW_CARD;
      case 2:
        return RED_CARD;
      default:
        return '';
    }
  }, [cardStatus]);
  return <Image src={img} className='fit-h' />;
};
