import styled from '@emotion/styled';
import { FC } from 'react';
import { MatchInfoBar } from './components/match-info-bar';
import { MatchBottomBar } from './components/match-bottom-bar';
import { MatchAllianceResult } from './components/match-alliance-result';
import { Event, Match, Ranking } from '@toa-lib/models';

const Container = styled.div`
  display: grid;
  grid-template-rows: 1fr 10fr 1fr;
  grid-template-columns: 1fr;
  grid-template-areas: 'header' 'content' 'footer';
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
`;

const Content = styled.div`
  height 100%;
  width: 100%;
  display: flex;
  flex-direction: row;
  position: relative;
`;

interface Props {
  event: Event;
  match: Match<any>;
  ranks: Ranking[];
}

export const MatchResults: FC<Props> = ({ event, match, ranks }) => {
  return (
    <Container>
      <MatchInfoBar title={match.name} />
      <Content>
        <MatchAllianceResult
          participants={match.participants ?? []}
          ranks={ranks}
          alliance='red'
        />
        <MatchAllianceResult
          participants={match.participants ?? []}
          alliance='blue'
          ranks={ranks}
          invert
        />
      </Content>
      <MatchBottomBar title={event.eventName} />
    </Container>
  );
};
