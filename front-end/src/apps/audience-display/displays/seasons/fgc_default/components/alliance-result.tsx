import styled from '@emotion/styled';
import { FC, useMemo } from 'react';
import RED_BANNER from '../assets/red-top-banner.png';
import BLUE_BANNER from '../assets/blue-top-banner.png';
import { Alliance, BLUE_STATION, Match, Ranking, Team } from '@toa-lib/models';
import { CountryFlag } from './country-flag';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import { ResultsBreakdown } from '../../../displays';
import { Breakdown as Breakdown2024 } from '../../fgc_2024';
import { Grid } from '@mui/material';
import BreakdownRow from './breakdown-row';
import { Block } from '@mui/icons-material';
import { CardStatus } from '@toa-lib/models/build/seasons/FeedingTheFuture';

const Container = styled.div`
  display: flex;
  flex-direction: column;
`;

const TopBanner = styled.img`
  width: 100%;
  height: auto;
  margin-top: -2px;
  margin-bottom: -2px;
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

const BreakdownContainer = styled.div((props: { alliance: Alliance }) => ({
  backgroundColor: props.alliance === 'red' ? '#ce2000' : '#5c88ff',
  height: '50vh',
  width: '100%',
  marginTop: '-1px',
  paddingBottom: '1em',
  paddingLeft: '1em',
  paddingRight: '1em',
  paddingTop: '1em'
}));

const BreakdownTable = styled(Grid)(() => ({
  width: '100%',
  height: '100%',
  '> :nth-of-type(odd)': {
    backgroundColor: '#ffffff',
    color: 'black'
  },
  '> :nth-of-type(even)': {
    backgroundColor: '#e9e9e9',
    color: 'black'
  }
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
  paddingRight: '1em;',
  marginTop: '-2px'
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
  fontWeight: '600'
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
  teams?: Team[];
}

export const AllianceResult: FC<Props> = ({
  alliance,
  match,
  ranks,
  teams
}) => {
  const participants = match.participants ?? [];
  const allianceParticipants = participants.filter((p) =>
    alliance === 'red' ? p.station < BLUE_STATION : p.station >= BLUE_STATION
  );
  const teamsRecord = useMemo(
    () => (teams ? Object.fromEntries(teams.map((t) => [t.teamKey, t])) : {}),
    [teams]
  );
  const isPlayoffs =
    match.tournamentKey === 't3' || match.tournamentKey === 't4';
  const isAllianceRedCard =
    allianceParticipants.filter((p) => p.cardStatus === CardStatus.RED_CARD)
      .length >= 3;
  const showZeroScore = isPlayoffs && isAllianceRedCard;

  // try to get breakdown sheet
  let breakdown: ResultsBreakdown<any>[] = [];

  // TODO: move this to the generic model thingy for each year
  switch (match.eventKey.split('-')[0]?.replace('FGC_', '')) {
    case '2024':
      breakdown = Breakdown2024;
  }

  const penaltyCalc = () => {
    if (alliance === 'red') {
      const total = match.blueMajPen + match.blueMinPen;
      return total > 0 ? `+ ${total}` : '0';
    } else {
      const total = match.redMajPen + match.redMinPen;
      return total > 0 ? `+ ${total}` : '0';
    }
  };

  // Calculate the size of each row in the breakdown table
  const breakdownRowSize = 12 / (breakdown.length + 2);

  return (
    <Container>
      <TopBanner src={alliance === 'red' ? RED_BANNER : BLUE_BANNER} />
      <AllianceContainer alliance={alliance} size={allianceParticipants.length}>
        {allianceParticipants.map((p) => {
          // TODO: this seems horribly inefficient
          const rank = ranks.find((r) => r.teamKey === p.teamKey);
          if (!p.team && !teamsRecord[p.teamKey]) return null;
          return (
            <AllianceTeam
              key={p.station}
              alliance={alliance}
              team={p.team ?? teamsRecord[p.teamKey]}
              rank={rank}
            />
          );
        })}
      </AllianceContainer>
      <BreakdownContainer alliance={alliance}>
        <BreakdownTable container direction='column' gap={0.5}>
          {breakdown.map((b, i) => (
            <Grid item key={i} xs={breakdownRowSize}>
              <BreakdownRow breakdown={b} match={match} alliance={alliance} />
            </Grid>
          ))}
          {/* Penalty Row */}
          <Grid item xs={breakdownRowSize}>
            <BreakdownRow
              match={match}
              alliance={alliance}
              breakdown={{
                icon: <Block fontSize='inherit' />,
                title: alliance === 'red' ? 'Blue Penalty' : 'Red Penalty',
                color: 'red',
                resultCalc: penaltyCalc
              }}
            />
          </Grid>
        </BreakdownTable>
      </BreakdownContainer>
      <ScoreContainer alliance={alliance}>
        <ScoreText>TOTAL:</ScoreText>
        <ScoreText>
          {showZeroScore
            ? 0
            : alliance === 'red'
            ? match.redScore
            : match.blueScore}
        </ScoreText>
      </ScoreContainer>
    </Container>
  );
};
