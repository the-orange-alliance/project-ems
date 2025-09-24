import styled from '@emotion/styled';
import { Alliance, BLUE_STATION, MatchParticipant } from '@toa-lib/models';
import { FC } from 'react';

const Container = styled.div((props: { alliance: Alliance }) => ({
  width: '100%',
  backgroundColor: props.alliance === 'red' ? '#830E12' : '#004172'
}));

const TopBar = styled.div((props: { alliance: Alliance }) => ({
  width: '100%',
  height: '2vh',
  backgroundColor: props.alliance === 'red' ? '#ed1c24' : '#0066B3'
}));

const TeamContainer = styled.div`
  background-color: #ffffff;
  height: 4vh;
  width: 100%;
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-direction: row;
`;

const TeamText = styled.div`
  width: 20%;
  height: 100%;
  font-size: 3vh;
  font-weight: bold;
  color: #101820;
  display: flex;
  justify-content: center;
  align-items: center;
`;

interface Props {
  alliance: Alliance;
  participants: MatchParticipant[];
}

export const MatchAlliancePlay: FC<Props> = ({ alliance, participants }) => {
  const allianceParticipants = participants.filter((p) =>
    alliance === 'red' ? p.station < BLUE_STATION : p.station >= BLUE_STATION
  );
  return (
    <Container alliance={alliance}>
      <TopBar alliance={alliance} />
      <TeamContainer>
        {allianceParticipants.map((p) => (
          <TeamText key={p.station}>{p.teamKey}</TeamText>
        ))}
      </TeamContainer>
    </Container>
  );
};
