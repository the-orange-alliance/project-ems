import { FC } from 'react';
import { DisplayProps } from '../../displays.js';
import styled from '@emotion/styled';
import FGC_BG from './assets/global-bg.png';
import FGC_LOGO from './assets/fg-logo-lg.png';
import { AlliancePreview } from './components/alliance-preview.js';
import MatchTitle from './components/match-title.js';

const BGImage = styled.div`
  background-image: url(${FGC_BG});
  background-size: cover;
  width: 100vw;
  height: 100vh;
`;

const Container = styled.div`
  background-size: cover;
  background: linear-gradient(
    to right,
    #00000000,
    #00000000 15%,
    #0000007c 15%,
    #0000007c 85%,
    #00000000 85%
  );
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: grid;
  grid-template-rows: 20vh 9vh 30vh 30vh;
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

export const MatchPreview: FC<DisplayProps> = ({ match, ranks }) => {
  return (
    <BGImage>
      <Container>
        <LogoContainer>
          <Logo src={FGC_LOGO} />
        </LogoContainer>
        <MatchTitle match={match} />
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
    </BGImage>
  );
};
