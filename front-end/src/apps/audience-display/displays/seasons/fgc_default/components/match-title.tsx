import styled from '@emotion/styled';
import { Match } from '@toa-lib/models';

const InfoContainer = styled.div`
  grid-area: info;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #ffffff;
  border-radius: 0.5em;
  margin-left: 15%;
  margin-right: 15%;
  padding-top: .1em;
  padding-bottom: .1em;
  color: black;
  line-height: 0.95;
  font-size: 4vh;
  font-weight: 800;
`;

const MatchTitle = ({ match }: { match: Match<any> }) => {
  return (
    <InfoContainer>
      <div>{match.name}</div>
      <div>Field {match.fieldNumber}</div>
    </InfoContainer>
  );
};

export default MatchTitle;
