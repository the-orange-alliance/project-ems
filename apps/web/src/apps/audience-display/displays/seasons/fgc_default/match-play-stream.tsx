import { FC } from 'react';
import { DisplayProps } from '../../displays';
import styled from '@emotion/styled';
import { AlliancePlay } from './components/alliance-play';
import { MatchScoreBug } from './components/match-score-bug';

const Container = styled.div`
  background-color: #000000;
  position: absolute;
  bottom: 0;
  left: 32vw;
  height: 18vh;
  width: 36vw;
  border-top-left-radius: 1em;
  border-top-right-radius: 1em;
  display: grid;
  grid-template-columns: 12vw 12vw 12vw;
  grid-template-rows: auto 3vh;
  grid-template-areas:
    'left center right'
    'bottom bottom bottom';
`;

const BottomBar = styled.div`
  background-color: #d5ff8b;
  grid-area: bottom;
  font-size: 2vh;
  font-weight: bold;
  padding-left: 1em;
  padding-right: 1em;
  display: flex;
`;

const LeftText = styled.div`
  margin-right: auto;
`;

const RightText = styled.div`
  margin-left: auto;
`;

export const MatchPlayStream: FC<DisplayProps> = ({ event, match, teams }) => {
  const matchParts = match.name.split(' ');
  const matchNumber = matchParts[matchParts.length - 1];
  const field = match.fieldNumber;
  return (
    <Container>
      <AlliancePlay
        alliance='red'
        participants={match.participants ?? []}
        teams={teams}
      />
      <MatchScoreBug match={match} />
      <AlliancePlay
        alliance='blue'
        participants={match.participants ?? []}
        teams={teams}
        invert
      />
      <BottomBar>
        <LeftText>
          Match&nbsp;{matchNumber}&nbsp;|&nbsp;Field&nbsp;{field}
        </LeftText>
        <RightText>{event.eventName}</RightText>
      </BottomBar>
    </Container>
  );
};
