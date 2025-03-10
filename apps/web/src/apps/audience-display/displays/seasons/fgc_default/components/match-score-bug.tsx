import styled from '@emotion/styled';
import { FC } from 'react';
import FGC_LGO from '../assets/fg-logo-md.png';
import { Alliance, Match } from '@toa-lib/models';
import { MatchTimer } from 'src/components/util/match-timer';

const Container = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 999;
`;

const InnerContainer = styled.div`
  position: absolute;
  height: 26vh;
  bottom: -1.5vh;
  width: 100%;
  background-color: #000000;
  border-top-left-radius: 2em;
  border-top-right-radius: 2em;
  padding: 0 0.5em 0.5em 0.5em;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto 1fr 1fr;
  grid-template-areas:
    'logo logo'
    'timer timer'
    'red blue';
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
  color: '#ffffff',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontWeight: 'bold',
  fontSize: '5vh',
  lineHeight: '5vh'
}));

interface Props {
  match: Match<any>;
}

export const MatchScoreBug: FC<Props> = ({ match }) => {
  return (
    <Container>
      <InnerContainer>
        <LogoContainer>
          <Logo src={FGC_LGO} />
        </LogoContainer>
        <TimerContainer>
          <MatchTimer audio />
        </TimerContainer>
        <ScoreContainer alliance='red'>{match.redScore}</ScoreContainer>
        <ScoreContainer alliance='blue'>{match.blueScore}</ScoreContainer>
      </InnerContainer>
    </Container>
  );
};
