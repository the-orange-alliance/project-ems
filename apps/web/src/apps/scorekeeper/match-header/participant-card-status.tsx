import { Button } from 'antd';
import { CSSProperties, FC } from 'react';

interface CardOption {
  label: string;
  style?: CSSProperties;
}

const NO_CARD: CardOption = { label: 'No Card' };
const YELLOW_CARD: CardOption = {
  label: 'Yellow Card',
  style: { background: '#fadb14', borderColor: '#d4b106', color: '#000' }
};
const RED_CARD: CardOption = {
  label: 'Red Card',
  style: { background: '#cf1322', borderColor: '#a8071a', color: '#fff' }
};
const WHITE_CARD: CardOption = {
  label: 'White Card',
  style: { background: '#fff', borderColor: '#bfbfbf', color: '#000' }
};

// Index in each list is the participant's `cardStatus` value.
const DEFAULT_CARDS = [NO_CARD, YELLOW_CARD, RED_CARD];
const FGC_CARDS = [NO_CARD, YELLOW_CARD, RED_CARD, WHITE_CARD];

interface Props {
  cardStatus: number;
  disabled?: boolean;
  onChange: (status: number) => void;
}

const CardStatusButton: FC<Props & { cards: CardOption[] }> = ({
  cards,
  cardStatus,
  disabled,
  onChange
}) => {
  const card = cards[cardStatus] ?? NO_CARD;
  return (
    <Button
      block
      disabled={disabled}
      onClick={() => onChange((cardStatus + 1) % cards.length)}
      // Keep the card colour visible while disabled so it can still be read.
      style={{ fontWeight: 600, ...card.style }}
    >
      {card.label}
    </Button>
  );
};

export const ParticipantCardStatus: FC<Props> = (props) => (
  <CardStatusButton cards={DEFAULT_CARDS} {...props} />
);

export const FGCParticipantCardStatus: FC<Props> = (props) => (
  <CardStatusButton cards={FGC_CARDS} {...props} />
);
