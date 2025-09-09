import React from 'react';
import { Space, Typography } from 'antd';
import AllianceScore, { AllianceScoreStream } from './alliance-score.js';
import AllianceTeams from './alliance-teams.js';
import { Match, Team } from '@toa-lib/models';
import { AllianceTeamStream } from './alliance-team.js';
import AllianceBox from './alliance-box.js';

interface AllianceSheetProps {
  match: Match<any>;
  teams?: Team[];
  allianceColor: 'red' | 'blue';
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
  allianceColor
}) => {
  const win = calcWin(match, allianceColor);
  const allianceTeams = getAllianceTeams(match, allianceColor);

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
        {allianceColor.toUpperCase()}
      </Typography.Title>

      <AllianceScore
        match={match}
        allianceColor={allianceColor}
        isWinning={win}
      />
      <div style={{ marginTop: 24, width: '100%' }}>
        <AllianceTeams teams={allianceTeams ?? []} large />
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
          <AllianceTeamStream key={index} team={team} />
        ))}
      </Space>
    </AllianceBox>
  );
};

export default AllianceSheet;
