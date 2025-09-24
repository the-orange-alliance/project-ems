import styled from '@emotion/styled';
import {
  Alliance,
  BLUE_STATION,
  MatchParticipant,
  Ranking,
  Team
} from '@toa-lib/models';
import { FC } from 'react';

const Container = styled.div((props: { alliance: Alliance; size: number }) => ({
  width: '100%',
  backgroundColor: props.alliance === 'red' ? '#830E12' : '#004172',
  display: 'grid',
  gridTemplateRows: `repeat(${props.size + 1}, 1fr)`,
  padding: '16px 32px 10vh 32px'
}));

const AllianceHeader = styled.div`
  color: #ffffff;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: 2.25vw;
  & > div {
    background-color: #ffffff;
  }
`;

const TeamContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const TeamRow = styled.div`
  width: 35vw;
  height: 12vh;
  background-color: #ffffff;
  box-shadow: -4px 4px 4px -2px rgba(0, 0, 0, 0.5);
  display: grid;
  grid-template-rows: 1fr 1fr;
  font-size: 1.5vw;
  font-weight: bold;
`;

const TeamHeader = styled.div((props: { alliance: Alliance }) => ({
  height: '100%',
  color: '#ffffff',
  backgroundColor: props.alliance === 'red' ? '#ed1c24' : '#0066B3',
  paddingLeft: '16px',
  display: 'flex',
  '& > div': {
    display: 'flex',
    alignItems: 'center'
  }
}));

const TeamKey = styled.div`
  width: 100%;
`;

const TeamRank = styled.div`
  background-color: #101820;
  height: 6vh;
  width: 6vh;
  justify-content: center;
`;

const TeamName = styled.div`
  height: 100%;
  color: #000000;
  padding-left: 16px;
`;

interface AllianceProps {
  alliance: Alliance;
  team?: Team;
  ranking?: Ranking;
}

// TODO - Handle display for team yellow card
const AllianceTeam: FC<AllianceProps> = ({ alliance, team, ranking }) => {
  return (
    <TeamContainer>
      <TeamRow>
        <TeamHeader alliance={alliance}>
          <TeamKey>Team&nbsp;{team?.teamKey}</TeamKey>
          {ranking && <TeamRank>{ranking.rank}</TeamRank>}
        </TeamHeader>
        <TeamName>{team?.teamNameShort}</TeamName>
      </TeamRow>
    </TeamContainer>
  );
};

interface Props {
  alliance: Alliance;
  participants: MatchParticipant[];
  ranks: Ranking[];
}

export const MatchAlliancePreview: FC<Props> = ({
  alliance,
  participants,
  ranks
}) => {
  const title = `${alliance} alliance`.toUpperCase();
  const allianceParticipants = participants.filter((p) =>
    alliance === 'red' ? p.station < BLUE_STATION : p.station >= BLUE_STATION
  );
  return (
    <Container alliance={alliance} size={allianceParticipants.length}>
      <AllianceHeader>{title}</AllianceHeader>
      {allianceParticipants.map((p) => (
        <AllianceTeam
          key={p.station}
          alliance={alliance}
          team={p.team}
          ranking={ranks.find((r) => r.teamKey === p.teamKey)}
        />
      ))}
    </Container>
  );
};
