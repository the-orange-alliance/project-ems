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
import { Typography } from '@mui/material';
import { useAllianceMember } from 'src/api/use-alliance-data';

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
  backgroundColor: '#ffffff',
  display: 'grid',
  color: 'black',
  gridTemplateRows: `repeat(${props.size}, 1fr)`
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

const AllianceText = styled.div((props: { small?: boolean }) => ({
  position: 'relative',
  width: 0,
  top: '40%',
  left: props.small ? '-6vw' : '-7vw',
  textAlign: 'center',
  color: 'white'
}));

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
  small?: boolean;
}

export const AlliancePreview: FC<Props> = ({
  alliance,
  participants,
  ranks,
  small
}) => {
  const allianceParticipants = participants.filter((p) =>
    alliance === 'red' ? p.station < BLUE_STATION : p.station >= BLUE_STATION
  );
  const [firstTeam] = allianceParticipants;
  const firstTeamAlliance = useAllianceMember(
    firstTeam.eventKey,
    firstTeam.tournamentKey,
    firstTeam.teamKey
  );
  return (
    <Container>
      <Banner src={alliance === 'red' ? RED_BANNER : BLUE_BANNER} />
      {firstTeamAlliance && (
        <AllianceText small={small}>
          <Typography variant={'h5'} sx={{ fontWeight: 'bold' }}>
            {/* \u00A0 is a non-breaking space. since the width is 0, we need non breaking spaces otherwise every space will put things onto new lines */}
            {firstTeamAlliance.allianceNameLong.replaceAll(' ', '\u00A0')}
          </Typography>
        </AllianceText>
      )}
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
