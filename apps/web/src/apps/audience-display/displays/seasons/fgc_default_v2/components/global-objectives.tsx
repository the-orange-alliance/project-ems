import React from 'react';
import { Typography, Row, Col } from 'antd';
import GlobalObjectiveItem, { GlobalObjectiveItemStream } from './global-objective-item.js';
import { Match } from '@toa-lib/models';
import { ResultsBreakdown } from '../../../displays.js';
import { GlobalBreakdownFGC25 } from '../../fgc_2025/index.js';

interface GlobalObjectivesProps {
  match: Match<any>; // Replace 'any' with the actual type of match if available
}

const GlobalObjectives: React.FC<GlobalObjectivesProps> = ({ match }) => {
  // try to get breakdown sheet
  let breakdown: ResultsBreakdown<any>[] = [];

  switch (match.eventKey.split('-')[0]?.replace('FGC_', '')) {
    case '2025':
      breakdown = GlobalBreakdownFGC25;
      break;
  }

  return (
    <div style={{ width: '100%', textAlign: 'center', marginBottom: '0.5rem' }}>
      <Typography.Title
        level={1}
        style={{
          color: '#a7f3d0',
          fontSize: '2.5rem',
          fontWeight: 'bold',
          margin: 0,
          textShadow: '0 0 15px #000'
        }}
      >
        GLOBAL OBJECTIVES
      </Typography.Title>

      <div
        style={{
          backgroundColor: '#10522c7a',
          borderRadius: '1.5rem',
          padding: '1rem',
          boxShadow:
            '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '2px solid #48bb78'
        }}
      >
        <Row gutter={[16, 16]}>
          {breakdown.map((item, index) => (
            <Col key={index} span={12}>
              <GlobalObjectiveItem
                title={item.title}
                value={item.resultCalc(match, 'red')}
                color='#10522c'
              />
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
};

// Component for the Global Objectives panel
export const GlobalObjectivesStream: React.FC<GlobalObjectivesProps> = ({
  match
}) => {
  // try to get breakdown sheet
  let breakdown: ResultsBreakdown<any>[] = [];

  switch (match.eventKey.split('-')[0]?.replace('FGC_', '')) {
    case '2025':
      breakdown = GlobalBreakdownFGC25;
      break;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0',
        flex: 1
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.5rem'
        }}
      >
        {breakdown.map((item, index) => (
          <GlobalObjectiveItemStream
            key={index}
            title={item.title}
            value={item.resultCalc(match, 'red')}
          />
        ))}
      </div>
    </div>
  );
};

export default GlobalObjectives;
