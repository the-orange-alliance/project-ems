import React from 'react';
import { Space } from 'antd';
import AllianceTeam from './alliance-team.js';
import { MatchParticipant } from '@toa-lib/models';

interface AllianceTeamsProps {
  teams: MatchParticipant[];
  large?: boolean;
  isPlayoffs?: boolean;
}

const AllianceTeams: React.FC<AllianceTeamsProps> = ({
  teams,
  large,
  isPlayoffs
}) => (
  <Space direction='vertical' size={16} style={{ width: '100%' }}>
    {teams.map((team, idx) => (
      <AllianceTeam
        key={idx}
        team={team}
        large={large}
        noRankChange={isPlayoffs}
      />
    ))}
  </Space>
);

export default AllianceTeams;
