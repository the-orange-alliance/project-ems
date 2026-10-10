import React from 'react';
import { Space, Typography } from 'antd';
import AllianceScore, { AllianceScoreStream } from './alliance-score.js';
import AllianceTeams from './alliance-teams.js';
import { Match, Team } from '@toa-lib/models';
import { AllianceTeamStream } from './alliance-team.js';
import AllianceBox from './alliance-box.js';
import { HighScoreBanner } from './high-score-banner.js';
import { useAllianceMember } from 'src/api/use-alliance-data.js';
import { useIsPlayoffsMatch } from 'src/api/use-tournament-data.js';

interface AllianceSheetProps {
  match: Match<any>;
  teams?: Team[];
  allianceColor: 'red' | 'blue';
  /**
   * `'banner'` renders the NEW HIGH SCORE banner between this alliance's score
   * box and its team list. `'spacer'` reserves the same height invisibly, which
   * the opposing column needs so both team lists stay aligned. Omit for a match
   * that set no record.
   */
  highScoreSlot?: 'banner' | 'spacer';
}

const calcWin = (match: Match<any>, allianceColor: 'red' | 'blue') => {
  return (
    match.blueScore === match.redScore || // Tie
    (allianceColor === 'red' && match.redScore > match.blueScore) || // Red and winning
    (allianceColor === 'blue' && match.blueScore > match.redScore) // Blue and winning
  );
};

const getAllianceTeams = (match: Match<any>, allianceColor: 'red' | 'blue') => {
  return match.participants?.filter((team) => {
    return (
      (allianceColor === 'red' && team.station < 20) ||
      (allianceColor === 'blue' && team.station >= 20)
    );
  });
};

const AllianceSheet: React.FC<AllianceSheetProps> = ({
  match,
  teams,
  allianceColor,
  highScoreSlot
}) => {
  const win = calcWin(match, allianceColor);
  const allianceTeams = getAllianceTeams(match, allianceColor);
  // Rankings only mean something in Qualification/Ranking tournaments.
  const hideRanks = useIsPlayoffsMatch(match);

  const redAllianceNum = useAllianceMember(
    match?.eventKey || '',
    match?.tournamentKey || '',
    match?.participants?.filter((t) => t.station < 20)[0]?.teamKey || 0
  );

  const blueAllianceNum = useAllianceMember(
    match?.eventKey || '',
    match?.tournamentKey || '',
    match?.participants?.filter((t) => t.station >= 20)[0]?.teamKey || 0
  );

  const redHeader = redAllianceNum
    ? `Red (${redAllianceNum.allianceNameLong})`
    : 'Red';
  const blueHeader = blueAllianceNum
    ? `Blue (${blueAllianceNum.allianceNameLong})`
    : 'Blue';

  // Backfill team data just in case
  allianceTeams?.forEach((participant) => {
    if (!participant.team)
      participant.team = teams?.find((t) => t.teamKey === participant.teamKey);
  });

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '100%'
      }}
    >
      <Typography.Title
        level={1}
        style={{
          fontSize: '2.5rem',
          color: allianceColor === 'red' ? '#f87171' : '#60a5fa',
          fontWeight: 'bold',
          margin: 0,
          textShadow: '0 0 15px #000'
        }}
      >
        {allianceColor === 'red' ? redHeader : blueHeader}
      </Typography.Title>

      <AllianceScore
        match={match}
        allianceColor={allianceColor}
        isWinning={win}
      />
      {highScoreSlot && <HighScoreBanner hidden={highScoreSlot === 'spacer'} />}
      <div style={{ width: '100%' }}>
        <AllianceTeams
          teams={allianceTeams ?? []}
          large
          hideRanks={hideRanks}
        />
      </div>
    </div>
  );
};

// Component to display an alliance's score and team list
export const AllianceSheetStream: React.FC<AllianceSheetProps> = ({
  match,
  teams,
  allianceColor
}) => {
  const win = calcWin(match, allianceColor);
  const allianceTeams = getAllianceTeams(match, allianceColor);
  // Rankings only mean something in Qualification/Ranking tournaments.
  const hideRanks = useIsPlayoffsMatch(match);
  const borderColor = win ? '#fcd34d' : 'transparent';

  // Backfill team data just in case
  allianceTeams?.forEach((participant) => {
    if (!participant.team)
      participant.team = teams?.find((t) => t.teamKey === participant.teamKey);
  });

  return (
    <AllianceBox allianceColor={allianceColor} borderColor={borderColor}>
      <AllianceScoreStream
        match={match}
        allianceColor={allianceColor}
        isWinning={false}
      />
      <Space
        size='middle'
        style={{
          width: '100%',
          justifyContent: 'space-between',
          marginTop: -10
        }}
      >
        {allianceTeams?.map((team, index) => (
          <AllianceTeamStream
            key={index}
            team={team}
            hideRanks={hideRanks}
          />
        ))}
      </Space>
    </AllianceBox>
  );
};

export default AllianceSheet;
