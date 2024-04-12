import styled from '@emotion/styled';
import { Alliance, BLUE_STATION, MatchParticipant } from '@toa-lib/models';
import { FC } from 'react';
import { MatchBillboard } from './match-billboard';

const Container = styled.div((props: { alliance: Alliance }) => ({
  width: '100%',
  height: '100%',
  backgroundColor: props.alliance === 'red' ? '#830E12' : '#004172'
}));

const TopBar = styled.div((props: { alliance: Alliance }) => ({
  width: '100%',
  height: '2vh',
  backgroundColor: props.alliance === 'red' ? '#ed1c24' : '#0066B3'
}));

const ScoreContainer = styled.div`
  width: 12vw;
  height: 10vw;
`;

const AllianceContainer = styled.div`
  width: calc(100% - 12vw);
  height: calc(100% - 10vw - 2vh);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 16px;
  padding: 32px;
`;

const TeamContainer = styled.div((props: { alliance: Alliance }) => ({
  backgroundColor: props.alliance === 'red' ? '#ed1c24' : '#0066B3',
  height: '6vh',
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '3vh',
  fontWeight: 'bold',
  color: '#ffffff'
}));

const TeamText = styled.div`
  height: 6vh;
  width: 7rem;
  background-color: #ffffff;
  color: #101820;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px;
`;

const NameText = styled.div`
  padding-left: 16px;
`;

const RankText = styled.div`
  background-color: #101820;
  height: 6vh;
  width: 6vh;
  margin-left: auto;
  display: flex;
  justify-content: center;
  align-items: center;
`;

interface Props {
  participants: MatchParticipant[];
  alliance: Alliance;
  invert?: boolean;
}

export const MatchAllianceResult: FC<Props> = ({
  participants,
  alliance,
  invert
}) => {
  const allianceParticipants = participants.filter((p) =>
    alliance === 'red' ? p.station < BLUE_STATION : p.station >= BLUE_STATION
  );
  return (
    <Container alliance={alliance}>
      <TopBar alliance={alliance} />
      <ScoreContainer
        style={invert ? { marginRight: 'auto' } : { marginLeft: 'auto' }}
      >
        <MatchBillboard
          alliance={alliance}
          top={alliance === 'red' ? 'Red' : 'Blue'}
          bot={20}
        />
      </ScoreContainer>
      <AllianceContainer
        style={invert ? { marginLeft: 'auto' } : { marginRight: 'auto' }}
      >
        {allianceParticipants.map((p) => (
          <TeamContainer key={p.station} alliance={alliance}>
            <TeamText>{p.teamKey}</TeamText>
            <NameText>{p.team?.teamNameShort}</NameText>
            <RankText>+9</RankText>
          </TeamContainer>
        ))}
      </AllianceContainer>
    </Container>
  );
};
