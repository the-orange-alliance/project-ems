import styled from '@emotion/styled';
import { Match } from '@toa-lib/models';
import FGC_LOGO from '../assets/fg-logo-inverted.png';

const InfoContainer = styled.div`
  display: grid;
  /* Equal side columns keep the text centered whether or not the logo shows */
  grid-template-columns: 20% 1fr 20%;
  align-items: center;
  background-color: #ffffff;
  border-radius: 1vw;
  margin-left: 15%;
  margin-right: 15%;
  padding: 0.15em 0;
  color: black;
  line-height: 1.05;
  font-weight: 800;
  text-align: center;
  height: 100%;
  box-sizing: border-box;
`;

const Logo = styled.div`
  height: 100%;
  min-height: 2em;
  box-sizing: border-box;
  /* Inset the logo so it doesn't touch the rounded container edges */
  padding: 0.15em 0.4em;
  background-origin: content-box;
  background-clip: content-box;
  background-image: url(${FGC_LOGO});
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
`;

const MatchTitle = ({
  match,
  branding = false,
  noMargin = false,
  fontSize = '3.3vh'
}: {
  match: Match<any>;
  branding?: boolean;
  noMargin?: boolean;
  fontSize?: string;
}) => {
  return (
    <InfoContainer style={{ margin: noMargin ? 0 : undefined, fontSize }}>
      {branding ? <Logo /> : <div />}
      <div>
        <div>{match.name}</div>
        <div>Field {match.fieldNumber}</div>
      </div>
      <div />
    </InfoContainer>
  );
};

export default MatchTitle;
