import { FC } from 'react';
import { DisplayProps } from '../../displays';
import FGC_BG from './assets/global-bg.png';
import styled from '@emotion/styled';
import { AllianceResult } from './components/alliance-result';
import MatchTitle from './components/match-title';

const Container = styled.div`
  background-image: url(${FGC_BG});
  background-size: cover;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
`;

const InnterContainer = styled.div`
  background-color: rgba(0, 0, 0, 0.38);
  width: 60vw;
  margin-left: 20vw;
  height: 100vh;
  display: grid;
  grid-template-rows: 15vh auto;
  grid-template-columns: 1fr 1fr;
  grid-template-areas:
    'info info'
    'red blue';
  column-gap: 2vw;
  padding-left: 1vw;
  padding-right: 1vw;
  padding-bottom: 2vh;
`;

const HeaderContainer = styled.div`
  grid-area: info;
  display: flex;
  justify-content: space-evenly;
  align-items: center;
`;

const ResultsText = styled.div`
  color: #ffffff;
  font-size: 6em;
  font-weight: bold;
`;

const InfoContainer = styled.div`
  width: 30vw;
`;

export const MatchResults: FC<DisplayProps> = ({ match, ranks, teams }) => {
  return (
    <Container>
      <InnterContainer>
        <HeaderContainer>
          <ResultsText>RESULTS</ResultsText>
          <InfoContainer>
            <MatchTitle match={match} noMargin />
          </InfoContainer>
        </HeaderContainer>
        <AllianceResult
          alliance='red'
          match={match}
          ranks={ranks}
          teams={teams}
        />
        <AllianceResult
          alliance='blue'
          match={match}
          ranks={ranks}
          teams={teams}
        />
      </InnterContainer>
    </Container>
  );
};
