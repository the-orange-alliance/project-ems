import { FC } from 'react';
import { DisplayProps } from '../../displays.js';
import styled from '@emotion/styled';
import { MatchTimer } from 'src/components/util/match-timer.js';
import { Alliance } from '@toa-lib/models';
import FGC_LGO from './assets/fg-logo-md.png';

const OuterContainer = styled.div`
  background-color: #00000000;
  position: absolute;
  bottom: 0;
  left: 32vw;
  height: 12vh;
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

const Container = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 999;
`;

const InnerContainer = styled.div`
  position: absolute;
  height: 16vh;
  bottom: -1.5vh;
  width: 100%;
  background-color: #000000;
  border-top-left-radius: 2em;
  border-top-right-radius: 2em;
  padding: 0 0.5em 0.5em 0.5em;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: auto 1fr 1fr;
  grid-template-areas:
    'logo logo logo'
    'timer timer timer';
  row-gap: 0.5em;
  column-gap: 0.5em;
`;

const LogoContainer = styled.div`
  height: 100%;
  width: 100%;
  text-align: center;
  padding: 1em 0.5em 0 0.5em;
  grid-area: logo;
`;

const Logo = styled.img`
  width: 100%;
  height: auto;
`;

const TimerContainer = styled.div`
  background-color: #f9ae3b;
  color: #000000;
  width: 100%;
  height: 100%;
  grid-area: timer;
  font-weight: bold;
  font-size: 8vh;
  line-height: 8vh;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
`;

const ScoreContainer = styled.div((props: { alliance: Alliance }) => ({
  backgroundColor: props.alliance === 'red' ? '#ce2000' : '#5c88ff',
  borderTopLeftRadius: props.alliance === 'red' ? '.5em' : '0',
  borderTopRightRadius: props.alliance === 'blue' ? '.5em' : '0',
  color: '#ffffff',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontWeight: 'bold',
  fontSize: '5vh',
  lineHeight: '5vh'
}));

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

export const MatchPlayMin: FC<DisplayProps> = ({ event, match }) => {
  const matchParts = match.name.split(' ');
  const matchNumber = matchParts[matchParts.length - 1];
  const field = match.fieldNumber;
  return (
    <OuterContainer>
      <ScoreContainer alliance='red'>{match.redScore}</ScoreContainer>
      <Container>
        <InnerContainer>
          <LogoContainer>
            <Logo src={FGC_LGO} />
          </LogoContainer>
          <TimerContainer>
            <MatchTimer audio />
          </TimerContainer>
        </InnerContainer>
      </Container>

      <ScoreContainer alliance='blue'>{match.blueScore}</ScoreContainer>
      <BottomBar>
        <LeftText>
          Match&nbsp;{matchNumber}&nbsp;|&nbsp;Field&nbsp;{field}
        </LeftText>
        <RightText>{event.eventName}</RightText>
      </BottomBar>
    </OuterContainer>
  );
};
