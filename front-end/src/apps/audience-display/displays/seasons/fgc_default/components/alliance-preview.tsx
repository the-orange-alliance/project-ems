import styled from '@emotion/styled';
import { FC } from 'react';
import RED_BANNER from '../assets/red-side-banner.png';
import BLUE_BANNER from '../assets/blue-side-banner.png';
import {
  Alliance,
  BLUE_STATION,
  MatchParticipant,
  Ranking,
  Team
} from '@toa-lib/models';
import { CountryFlag } from './country-flag';

const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
`;

const Banner = styled.img`
  width: auto;
  height: 100%;
`;

const AllianceContainer = styled.div((props: { size: number }) => ({
  width: '100%',
  height: '100%',
  'background-color': '#ffffff',
  display: 'grid',
  color: 'black',
  'grid-template-rows': `repeat(${props.size}, 1fr)`
}));

const TeamContainer = styled.div`
  border-bottom: 3px solid #cacaca;
  font-weight: bold;
  font-size: 3vh;
  gap: 16px;
  padding-left: 16px;
  padding-right: 16px;
  display: flex;
  align-items: center;
`;

const CountryText = styled.div`
  width: 5vw;
`;

const RankText = styled.div`
  margin-left: auto;
`;

interface AllianceTeamProps {
  team: Team;
  rank?: Ranking;
}

const AllianceTeam: FC<AllianceTeamProps> = ({ team, rank }) => {
  return (
    <TeamContainer>
      <CountryFlag cc={team.countryCode} />
      <CountryText>[{team.country}]</CountryText>
      <div>{team.teamNameLong}</div>
      {rank && <RankText>#{rank.rank}</RankText>}
    </TeamContainer>
  );
};

interface Props {
  alliance: Alliance;
  participants: MatchParticipant[];
  ranks: Ranking[];
}

export const AlliancePreview: FC<Props> = ({
  alliance,
  participants,
  ranks
}) => {
  const allianceParticipants = participants.filter((p) =>
    alliance === 'red' ? p.station < BLUE_STATION : p.station >= BLUE_STATION
  );
  return (
    <Container>
      <Banner src={alliance === 'red' ? RED_BANNER : BLUE_BANNER} />
      <AllianceContainer size={allianceParticipants.length}>
        {allianceParticipants.map((p) => {
          const rank = ranks.find((r) => r.teamKey === p.teamKey);
          if (!p.team) return null;
          return <AllianceTeam key={p.station} team={p.team} rank={rank} />;
        })}
      </AllianceContainer>
    </Container>
  );
};
