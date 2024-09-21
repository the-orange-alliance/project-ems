import { FC } from 'react';
import { DisplayProps } from '../../displays';
import styled from '@emotion/styled';
import FGC_BG from './assets/global-bg.png';
import { AlliancePlay } from './components/alliance-play';
import { MatchTimer } from 'src/components/util/match-timer';
import { Stack } from '@mui/material';
import MatchTitle from './components/match-title';
import { Alliance } from '@toa-lib/models';
import * as muiStyled from '@mui/material';

const BGImage = styled.div`
  background-image: url(${FGC_BG});
  background-size: cover;
  width: 100vw;
  height: 100vh;
`;

const Container = styled(Stack)(() => ({
  padding: '1em 1em'
}));

const MatchTitleContainer = styled.div`
  border: 0.8em solid #000000;
  border-radius: 1.5vw;
`;

const TimerContainer = styled.div`
  background-color: #f9ae3b;
  color: #000000;
  width: 100%;
  height: 65vh;
  border-radius: 3rem;
  border: 1rem solid #000000;
  font-weight: bold;
  font-size: 50vh;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
`;

const ScoreRow = muiStyled.styled(Stack)(() => ({
  marginTop: '-0.8rem !important',
  height: '19vh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  '> *:first-child': {
    borderLeft: '.8rem solid #000000',
    borderRight: '.4rem solid #000000',
    borderBottomLeftRadius: '3rem !important'
  },
  '> *:nth-child(2), > *:nth-child(3)': {
    borderLeft: '.4rem solid #000000',
    borderRight: '.4rem solid #000000'
  },
  '> *:last-child': {
    borderLeft: '.4rem solid #000000',
    borderRight: '.8rem solid #000000',
    borderBottomRightRadius: '3rem !important'
  },
  '> *': {
    borderTop: '.8rem solid #000000',
    borderBottom: '.8rem solid #000000'
  }
}));

const ScoreContainer = styled.div((props: { alliance: Alliance }) => ({
  backgroundColor: props.alliance === 'red' ? '#ce2000' : '#5c88ff',
  color: '#ffffff',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontWeight: 'bold',
  height: '100%',
  width: '20%',
  fontSize: '15vh',
  lineHeight: '5vh'
}));

export const MatchPlay: FC<DisplayProps> = ({ match }) => {
  return (
    <BGImage>
      <Container spacing={5}>
        <MatchTitleContainer>
          <MatchTitle match={match} noMargin branding />
        </MatchTitleContainer>
        <TimerContainer>
          <MatchTimer audio />
        </TimerContainer>
        <ScoreRow direction='row'>
          <AlliancePlay
            alliance='red'
            participants={match.participants ?? []}
            fullHeight
          />
          <ScoreContainer alliance='red'>{match.redScore}</ScoreContainer>
          <ScoreContainer alliance='blue'>{match.blueScore}</ScoreContainer>
          <AlliancePlay
            alliance='blue'
            participants={match.participants ?? []}
            invert
            fullHeight
          />
        </ScoreRow>
      </Container>
    </BGImage>
  );
};
