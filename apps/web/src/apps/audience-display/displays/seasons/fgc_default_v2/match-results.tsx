import GlobalObjectives from './components/global-objectives.js';
import AllianceSheet from './components/alliance-sheet.js';
import { Row, Col } from 'antd';
import { DisplayProps } from '../../displays.js';
import FGC_BG from './assets/global-bg.png';
import { FC } from 'react';
import DisplayHeader from './components/display-header.js';

export const MatchResults: FC<DisplayProps> = ({ match, ranks, teams }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        padding: '2rem',
        backgroundColor: '#161b22',
        overflow: 'hidden',
        backgroundImage: `url(${FGC_BG})`,
        backgroundSize: 'cover'
      }}
    >
      <DisplayHeader title={`Results | ${match.name}`} />
      <div
        style={{
          padding: '0rem 15rem'
        }}
      >
        <GlobalObjectives match={match} />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            marginTop: '1rem'
          }}
        >
          <Row gutter={[16, 16]} style={{ width: '100%', height: '100%' }}>
            <Col span={12} style={{ display: 'flex' }}>
              <AllianceSheet match={match} teams={teams} allianceColor='red' />
            </Col>
            <Col span={12} style={{ display: 'flex' }}>
              <AllianceSheet match={match} teams={teams} allianceColor='blue' />
            </Col>
          </Row>
        </div>
      </div>
    </div>
  );
};

export default MatchResults;
