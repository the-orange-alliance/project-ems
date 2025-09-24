
import { FC } from 'react';
import { DisplayProps } from '../../displays.js';
import { AllianceResult } from './components/alliance-result.js';
import MatchTitle from './components/match-title.js';
import { Space } from 'antd';
export const MatchResultsStream: FC<DisplayProps> = ({ match, ranks, teams }) => {
  return (
    <div
      style={{
        transform: 'scale(0.54)',
        transformOrigin: 'top left',
        marginTop: '1em',
        marginLeft: '1em'
      }}
    >
      <Space direction="vertical" size={40} style={{ width: '30vw' }}>
        <MatchTitle match={match} noMargin />
        <AllianceResult
          alliance='red'
          match={match}
          ranks={ranks}
          teams={teams}
        />
        <AllianceResult
          alliance='blue'
          match={match}
          ranks={ranks}
          teams={teams}
        />
      </Space>
    </div>
  );
};
