import { FC } from 'react';
import styled from '@emotion/styled';
import { CardStatus } from '@toa-lib/models';
import YELLOW_CARD from '../assets/penalty-yellow-card.png';

/**
 * Marks a team that is *carrying* a card from earlier in the event, as opposed
 * to one issued in the match currently on screen.
 *
 * Rendered separately from `<CardStatus />`, and never merged into it, for two
 * reasons. Visually, the audience needs to tell "was carded just now" from
 * "came into this match already carded" — hence the dimmed, outlined
 * treatment. Structurally, the carried card lives on `Team` while the
 * per-match card lives on `MatchParticipant`; folding one into the other is
 * exactly what would let a carried card leak into referee screens and scoring.
 */
const Ghost = styled.img`
  max-height: 100%;
  width: auto;
  opacity: 0.55;
  filter: grayscale(0.25);
`;

export const CarriedCard: FC<{ cardStatus?: number }> = ({ cardStatus }) => {
  if (cardStatus !== CardStatus.YELLOW_CARD) return null;
  return (
    <Ghost
      src={YELLOW_CARD}
      className='fit-h'
      title='Carrying a yellow card from an earlier match'
    />
  );
};
