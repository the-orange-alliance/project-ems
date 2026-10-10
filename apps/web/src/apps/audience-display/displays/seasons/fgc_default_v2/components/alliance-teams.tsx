import React from 'react';
import { Space } from 'antd';
import AllianceTeam from './alliance-team.js';
import { MatchParticipant } from '@toa-lib/models';

interface AllianceTeamsProps {
  teams: MatchParticipant[];
  large?: boolean;
  hideRanks?: boolean;
}

const AllianceTeams: React.FC<AllianceTeamsProps> = ({
  teams,
  large,
  hideRanks
}) => (
  <Space orientation='vertical' size={12} style={{ width: '100%' }}>
    {teams.map((team, idx) => (
      <AllianceTeam
        key={idx}
        team={team}
        large={large}
        hideRanks={hideRanks}
      />
    ))}
  </Space>
);

export default AllianceTeams;
