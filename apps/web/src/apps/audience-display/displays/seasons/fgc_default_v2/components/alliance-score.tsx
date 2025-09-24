import React from 'react';
import { Typography } from 'antd';
import { Match } from '@toa-lib/models';
import { ResultsBreakdown } from '../../../displays.js';
import { RegionalBreakdownFGC25 } from '../../fgc_2025/index.js';

interface AllianceScoreProps {
  match: Match<any>;
  allianceColor: 'red' | 'blue';
  isWinning: boolean;
}

const calcPenalty = (match: Match<any>, allianceColor: 'red' | 'blue') => {
  const penaltyAlliance = allianceColor === 'red' ? 'blue' : 'red';
  const penaltyPoints =
    penaltyAlliance === 'red'
      ? match.redMinPen + match.redMajPen
      : match.blueMinPen + match.blueMajPen;
  return { penaltyAlliance, penaltyPoints };
};

const AllianceScore: React.FC<AllianceScoreProps> = ({
  match,
  allianceColor,
  isWinning
}) => {
  // try to get breakdown sheet
  let breakdown: ResultsBreakdown<any>[] = [];

  switch (match.eventKey.split('-')[0]?.replace('FGC_', '')) {
    case '2025':
      breakdown = RegionalBreakdownFGC25;
      break;
  }

  const { penaltyAlliance, penaltyPoints } = calcPenalty(match, allianceColor);

  const borderColor = isWinning ? '#fcd34d' : 'transparent';
  const scoreCardStyle = {
    backgroundColor: `${allianceColor === 'red' ? '#991b1bca' : '#1e3a8aca'}`,
    borderRadius: '0.75rem',
    padding: '1rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    width: '100%',
    marginBottom: '1rem',
    border: `4px solid ${borderColor}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const leftSide = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        textAlign: 'left'
      }}
    >
      <div>
        {breakdown.map((item) => (
          <React.Fragment key={item.title}>
            <Typography.Text
              style={{
                fontSize: '1.2rem',
                fontWeight: 'semibold',
                color: '#cbd5e1'
              }}
            >
              {item.title}
            </Typography.Text>
            <Typography.Title
              level={3}
              style={{
                color: 'white',
                fontWeight: 'extrabold',
                margin: 0,
                fontSize: '2.4rem',
                textAlign: allianceColor === 'red' ? 'left' : 'right'
              }}
            >
              {item.resultCalc(match, allianceColor)}
            </Typography.Title>
          </React.Fragment>
        ))}
      </div>
      <div>
        <Typography.Text
          style={{
            fontSize: '1.2rem',
            fontWeight: 'semibold',
            color: '#cbd5e1'
          }}
        >
          {penaltyAlliance.charAt(0).toUpperCase() + penaltyAlliance.slice(1)}{' '}
          Alliance Penalties
        </Typography.Text>
        <Typography.Title
          level={3}
          style={{
            color: '#d1d5db',
            fontWeight: 'extrabold',
            margin: 0,
            fontSize: '2.4rem',
            textAlign: allianceColor === 'red' ? 'left' : 'right'
          }}
        >
          {penaltyPoints}
        </Typography.Title>
      </div>
    </div>
  );

  const rightSide = (
    <div style={{ textAlign: 'right' }}>
      <Typography.Text
        style={{
          fontSize: '1.5rem',
          fontWeight: 'semibold',
          color: '#cbd5e1'
        }}
      >
        Total Score
      </Typography.Text>
      <Typography.Title
        level={1}
        style={{
          color: 'white',
          fontWeight: 'extrabold',
          margin: 0,
          fontSize: '4.8rem',
          textAlign: allianceColor === 'blue' ? 'left' : 'right'
        }}
      >
        {allianceColor === 'red' ? match.redScore : match.blueScore}
      </Typography.Title>
    </div>
  );

  return (
    <div style={scoreCardStyle}>
      {allianceColor === 'red' ? leftSide : rightSide}
      {allianceColor === 'red' ? rightSide : leftSide}
    </div>
  );
};

const StreamSubScoreSize = '1.4rem';
const StreamScoreSize = '3.5rem';

export const AllianceScoreStream: React.FC<AllianceScoreProps> = ({
  match,
  allianceColor
}) => {
  // try to get breakdown sheet
  let breakdown: ResultsBreakdown<any>[] = [];

  switch (match.eventKey.split('-')[0]?.replace('FGC_', '')) {
    case '2025':
      breakdown = RegionalBreakdownFGC25;
      break;
  }

  const { penaltyAlliance, penaltyPoints } = calcPenalty(match, allianceColor);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.5rem'
      }}
    >
      {allianceColor === 'red' ? (
        <>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'left'
            }}
          >
            {breakdown.map((item) => (
              <Typography.Text
                key={item.title}
                style={{
                  color: 'white',
                  fontSize: StreamSubScoreSize,
                  fontWeight: 'bold',
                  lineHeight: '1.2'
                }}
              >
                {item.title}: {item.resultCalc(match, allianceColor)}
              </Typography.Text>
            ))}
            <Typography.Text
              style={{
                color: 'white',
                fontSize: StreamSubScoreSize,
                fontWeight: 'bold',
                lineHeight: '1.2'
              }}
            >
              {penaltyAlliance.charAt(0).toUpperCase() +
                penaltyAlliance.slice(1)}{' '}
              Penalty: {penaltyPoints}
            </Typography.Text>
          </div>
          <Typography.Title
            level={2}
            style={{
              color: 'white',
              margin: 0,
              fontWeight: 'bold',
              fontSize: StreamScoreSize
            }}
          >
            {match.redScore}
          </Typography.Title>
        </>
      ) : (
        <>
          <Typography.Title
            level={2}
            style={{
              color: 'white',
              margin: 0,
              fontWeight: 'bold',
              fontSize: StreamScoreSize
            }}
          >
            {match.blueScore}
          </Typography.Title>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'right',
              gap: '0.1rem'
            }}
          >
            {breakdown.map((item) => (
              <Typography.Text
                key={item.title}
                style={{
                  color: 'white',
                  fontSize: StreamSubScoreSize,
                  fontWeight: 'bold',
                  lineHeight: '1.2'
                }}
              >
                {item.title}: {item.resultCalc(match, allianceColor)}
              </Typography.Text>
            ))}
            <Typography.Text
              style={{
                color: 'white',
                fontSize: StreamSubScoreSize,
                fontWeight: 'bold',
                lineHeight: '1.2'
              }}
            >
              {penaltyAlliance.charAt(0).toUpperCase() +
                penaltyAlliance.slice(1)}{' '}
              Penalty: {penaltyPoints}
            </Typography.Text>
          </div>
        </>
      )}
    </div>
  );
};

export default AllianceScore;
