import { FC, useMemo } from 'react';
import YELLOW_CARD from '../assets/penalty-yellow-card.png';
import RED_CARD from '../assets/penalty-red-card.png';
import WHITE_CARD from '../assets/penalty-white-card.png';
import styled from '@emotion/styled';
import { FeedingTheFuture } from '@toa-lib/models';

const Image = styled.img`
  max-height: 100%;
  width: auto;
`;

export const CardStatus: FC<{ cardStatus: number }> = ({ cardStatus }) => {
  const img = useMemo(() => {
    switch (cardStatus) {
      case FeedingTheFuture.CardStatus.YELLOW_CARD:
        return YELLOW_CARD;
      case FeedingTheFuture.CardStatus.RED_CARD:
        return RED_CARD;
      case FeedingTheFuture.CardStatus.WHITE_CARD:
        return WHITE_CARD;
      default:
        return '';
    }
  }, [cardStatus]);
  return <Image src={img} className='fit-h' />;
};
