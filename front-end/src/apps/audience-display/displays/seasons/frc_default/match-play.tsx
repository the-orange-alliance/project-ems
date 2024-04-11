import styled from '@emotion/styled';
import { FC } from 'react';
import { MatchInfoBar } from './components/match-info-bar';
import { MatchAlliancePlay } from './components/match-alliance-play';
import { MatchBillboard } from './components/match-billboard';
import { MatchTimer } from 'src/components/util/match-timer';
import { SmartToyOutlined } from '@mui/icons-material';
import { Match } from '@toa-lib/models';

const Container = styled.div`
  position: absolute;
  bottom: 0;
  height: 20vh;
  width: 100vw;
  display: grid;
  grid-template-rows: 1fr 2fr;
  grid-template-columns: 3fr 8vw 8vw 8vw 3fr;
  grid-template-areas:
    'top top top top top'
    'left left-cen center right-cen right';
`;

const ScoreText = styled.span`
  font-size: 3vh;
`;

interface Props {
  match: Match<any>;
}

export const MatchPlay: FC<Props> = ({ match }) => {
  const { redScore, blueScore } = match;
  return (
    <Container>
      <MatchInfoBar title='Qualification Match 72' gridAreaId='top' />
      <MatchAlliancePlay
        alliance='red'
        participants={match.participants ?? []}
      />
      <MatchBillboard
        alliance='red'
        top={<ScoreText>Red</ScoreText>}
        bot={redScore.toString()}
      />
      <MatchBillboard
        top={<SmartToyOutlined fontSize='inherit' />}
        bot={<MatchTimer audio />}
      />
      <MatchBillboard
        alliance='blue'
        top={<ScoreText>Blue</ScoreText>}
        bot={blueScore.toString()}
      />
      <MatchAlliancePlay
        alliance='blue'
        participants={match.participants ?? []}
      />
    </Container>
  );
};
