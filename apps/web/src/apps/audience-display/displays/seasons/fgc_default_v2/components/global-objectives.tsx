import React from 'react';
import { Typography, Row, Col } from 'antd';
import GlobalObjectiveItem, {
  GlobalObjectiveItemStream
} from './global-objective-item.js';
import { Match } from '@toa-lib/models';
import { ResultsBreakdown } from '../../../displays.js';
import { GlobalBreakdownFGC25 } from '../../fgc_2025/index.js';
import { GlobalBreakdownFGC26 } from '../../fgc_2026/index.js';

interface GlobalObjectivesProps {
  match: Match<any>; // Replace 'any' with the actual type of match if available
}

// Season lookup for the global breakdown sheet. Adding a year means adding a
// single case here.
const getGlobalBreakdown = (match: Match<any>): ResultsBreakdown<any>[] => {
  switch (match.eventKey.split('-')[0]?.replace('FGC_', '')) {
    case '2025':
      return GlobalBreakdownFGC25;
    case '2026':
      return GlobalBreakdownFGC26;
    default:
      return [];
  }
};

/**
 * Lower-third arrangement for the global objective tiles.
 * - 'grid'    : two tiles per row (quadrant block) - for seasons with many goals.
 * - 'stacked' : one full-mid-width tile per row - for seasons with few goals.
 */
type GlobalObjectivesStreamLayout = 'grid' | 'stacked';

/** At or below this many global goals, a 2-up grid looks sparse - stack instead. */
const STACKED_LAYOUT_MAX_ITEMS = 2;

const resolveStreamLayout = (count: number): GlobalObjectivesStreamLayout =>
  count <= STACKED_LAYOUT_MAX_ITEMS ? 'stacked' : 'grid';

/** In a 2-up grid with an odd count, the last tile spans the full row. */
const isFullRowTile = (index: number, count: number): boolean =>
  count % 2 === 1 && index === count - 1;

const GlobalObjectives: React.FC<GlobalObjectivesProps> = ({ match }) => {
  // try to get breakdown sheet
  const breakdown = getGlobalBreakdown(match);

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
            <Col
              key={index}
              span={isFullRowTile(index, breakdown.length) ? 24 : 12}
            >
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
  const breakdown = getGlobalBreakdown(match);
  const layout = resolveStreamLayout(breakdown.length);

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
          gridTemplateColumns: layout === 'stacked' ? '1fr' : 'repeat(2, 1fr)',
          gap: '0.5rem'
        }}
      >
        {breakdown.map((item, index) => (
          <div
            key={index}
            style={{
              gridColumn:
                layout === 'grid' && isFullRowTile(index, breakdown.length)
                  ? '1 / -1'
                  : undefined
            }}
          >
            <GlobalObjectiveItemStream
              title={item.title}
              value={item.resultCalc(match, 'red')}
              color='#10522c'
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default GlobalObjectives;
