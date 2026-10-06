import GlobalObjectives from './components/global-objectives.js';
import AllianceSheet from './components/alliance-sheet.js';
import { Row, Col } from 'antd';
import { DisplayProps } from '../../displays.js';
import FGC_BG from './assets/global-bg.png';
import { FC } from 'react';
import DisplayHeader from './components/display-header.js';

export const MatchResults: FC<DisplayProps> = ({ match, teams }) => {
  return (
    <div
      style={{
        fontFamily: 'Roboto, sans-serif !important',
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
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
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          // `safe` keeps overflow below the header instead of spilling over it
          justifyContent: 'safe center',
          padding: '0rem 6rem'
        }}
      >
        <GlobalObjectives match={match} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            marginTop: '0.5rem'
          }}
        >
          <Row gutter={[24, 16]} style={{ width: '100%' }}>
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
