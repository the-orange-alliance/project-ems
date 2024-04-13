import { FC } from 'react';
import { DisplayProps } from '../../displays';
import styled from '@emotion/styled';
import FGC_BG from './assets/global-bg.png';
import FGC_LOGO from './assets/fg-logo-lg.png';
import { InfoBar } from './components/info-bar';
import { AlliancePreview } from './components/alliance-preview';

const Container = styled.div`
  background-image: url(${FGC_BG});
  background-size: cover;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: grid;
  grid-template-rows: 20vh 7vh 30vh 30vh;
  grid-template-areas:
    'logo'
    'info'
    'red'
    'blue';
  row-gap: 2vh;
  padding: 3vh 20vw;
`;

const LogoContainer = styled.div`
  grid-area: logo;
  height: 100%;
  width: 100%;
  text-align: center;
`;

const Logo = styled.img`
  max-height: 100%;
  width: auto;
`;

const InfoContainer = styled.div`
  grid-area: info;
  display: flex;
  justify-content: space-evenly;
  align-items: center;
`;

export const MatchPreview: FC<DisplayProps> = ({ match, ranks }) => {
  const matchParts = match.name.split(' ');
  const matchNumber = matchParts[matchParts.length - 1];
  return (
    <Container>
      <LogoContainer>
        <Logo src={FGC_LOGO} />
      </LogoContainer>
      <InfoContainer>
        <InfoBar left='match' right={matchNumber} />
        <InfoBar left='field' right={match.fieldNumber} />
      </InfoContainer>
      <AlliancePreview
        alliance='red'
        participants={match.participants ?? []}
        ranks={ranks}
      />
      <AlliancePreview
        alliance='blue'
        participants={match.participants ?? []}
        ranks={ranks}
      />
    </Container>
  );
};
