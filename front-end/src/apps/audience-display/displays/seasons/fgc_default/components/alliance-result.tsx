import styled from '@emotion/styled';
import { FC, useMemo } from 'react';
import RED_BANNER from '../assets/red-top-banner.png';
import BLUE_BANNER from '../assets/blue-top-banner.png';
import { Alliance, BLUE_STATION, Match, Ranking, Team } from '@toa-lib/models';
import { CountryFlag } from './country-flag';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';

const Container = styled.div`
  display: flex;
  flex-direction: column;
`;

const TopBanner = styled.img`
  width: 100%;
  height: auto;
  margin-top: -2px;
`;

const AllianceContainer = styled.div(
  (props: { alliance: Alliance; size: number }) => ({
    width: '100%',
    height: '20vh',
    backgroundColor: props.alliance === 'red' ? '#ce2000' : '#5c88ff',
    display: 'grid',
    gridTemplateRows: `repeat(${props.size}, 1fr)`,
    padding: '0.5em 1em'
  })
);

const BreakdownTable = styled.div((props: { alliance: Alliance }) => ({
  backgroundColor: props.alliance === 'red' ? '#ce2000' : '#5c88ff',
  height: '50vh',
  width: '100%',
  marginTop: '-1px'
}));

const ScoreContainer = styled.div((props: { alliance: Alliance }) => ({
  backgroundColor: props.alliance === 'red' ? '#ce2000' : '#5c88ff',
  width: '60%',
  height: '7vh',
  marginLeft: 'auto',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingLeft: '1em',
  paddingRight: '1em;'
}));

const ScoreText = styled.div`
  color: #ffffff;
  font-weight: bold;
  font-size: 4vh;
`;

const TeamContainer = styled.div((props: { alliance: Alliance }) => ({
  borderBottom:
    props.alliance === 'red'
      ? '2px solid rgb(118, 39, 45)'
      : '2px solid #2e3190',
  display: 'flex',
  alignItems: 'center',
  flexDirection: 'row',
  gap: '8px',
  color: '#ffffff',
  fontSize: '2.75vh',
  fontWeight: 'bold'
}));

interface AllianceTeamProps {
  alliance: Alliance;
  team: Team;
  rank?: Ranking;
}

const RankContainer = styled.div`
  margin-left: auto;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const RankText = styled.div`
  width: 100%;
  text-align: center;
`;

const AllianceTeam: FC<AllianceTeamProps> = ({ alliance, team, rank }) => {
  const rankIcon = useMemo(() => {
    if (!rank) return null;
    if (rank.rankChange === 0) {
      return <HorizontalRuleIcon fontSize='inherit' />;
    } else if (rank.rankChange > 0) {
      return <ArrowUpwardIcon fontSize='inherit' />;
    } else if (rank.rankChange < 0) {
      return <ArrowDownwardIcon fontSize='inherit' />;
    }
  }, [rank]);

  return (
    <TeamContainer alliance={alliance}>
      <CountryFlag cc={team.countryCode} />
      <div>{team.teamNameShort}</div>
      {rank && rankIcon && (
        <RankContainer>
          <RankText>{rank.rank}</RankText>
          <RankText style={{ marginTop: '8px' }}>{rankIcon}</RankText>
        </RankContainer>
      )}
    </TeamContainer>
  );
};

interface Props {
  alliance: Alliance;
  match: Match<any>;
  ranks: Ranking[];
}

export const AllianceResult: FC<Props> = ({ alliance, match, ranks }) => {
  const participants = match.participants ?? [];
  const allianceParticipants = participants.filter((p) =>
    alliance === 'red' ? p.station < BLUE_STATION : p.station >= BLUE_STATION
  );
  return (
    <Container>
      <TopBanner src={alliance === 'red' ? RED_BANNER : BLUE_BANNER} />
      <AllianceContainer alliance={alliance} size={allianceParticipants.length}>
        {allianceParticipants.map((p) => {
          const rank = ranks.find((r) => r.teamKey === p.teamKey);
          if (!p.team) return null;
          return (
            <AllianceTeam
              key={p.station}
              alliance={alliance}
              team={p.team}
              rank={rank}
            />
          );
        })}
      </AllianceContainer>
      <BreakdownTable alliance={alliance} />
      <ScoreContainer alliance={alliance}>
        <ScoreText>TOTAL:</ScoreText>
        <ScoreText>
          {alliance === 'red' ? match.redScore : match.blueScore}
        </ScoreText>
      </ScoreContainer>
    </Container>
  );
};
