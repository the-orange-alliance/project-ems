import { Row, Col, Input, InputNumber } from 'antd';
import {
  Match,
  getFunctionsBySeasonKey,
  getSeasonKeyFromEventKey
} from '@toa-lib/models';
import { FC } from 'react';

interface Props {
  match: Match<any>;
  onUpdate: (match: Match<any>) => void;
}

export const MatchInfoTab: FC<Props> = ({ match, onUpdate }) => {
  const handleUpdates = (name: string, value: string | number | null) => {
    const typedValue = typeof value === 'number' ? value : value;
    const newMatch = { ...match, [name]: typedValue };
    const seasonKey = getSeasonKeyFromEventKey(match.eventKey);
    const functions = getFunctionsBySeasonKey(seasonKey);
    if (!functions) return;
    const [redScore, blueScore] = functions.calculateScore(newMatch);
    onUpdate({ ...newMatch, redScore, blueScore });
  };
  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} sm={12} md={12}>
        <div style={{ marginBottom: 4 }}>Tournament ID</div>
        <Input
          value={match?.tournamentKey}
          disabled
          style={{ width: '100%' }}
          name='matchKey'
        />
      </Col>
      <Col xs={24} sm={12} md={12}>
        <div style={{ marginBottom: 4 }}>Match ID</div>
        <Input
          value={match?.id}
          disabled
          style={{ width: '100%' }}
          name='matchDetailKey'
        />
      </Col>
      <Col xs={24} sm={12} md={12}>
        <div style={{ marginBottom: 4 }}>Match Name</div>
        <Input
          value={match?.name}
          style={{ width: '100%' }}
          name='name'
          onChange={(e) => handleUpdates('name', e.target.value)}
        />
      </Col>
      <Col xs={24} sm={12} md={6}>
        <div style={{ marginBottom: 4 }}>Red Fouls</div>
        <InputNumber
          value={match?.redMinPen}
          style={{ width: '100%' }}
          name='redMinPen'
          min={0}
          onChange={(value) => handleUpdates('redMinPen', value)}
        />
      </Col>
      <Col xs={24} sm={12} md={6}>
        <div style={{ marginBottom: 4 }}>Blue Fouls</div>
        <InputNumber
          value={match?.blueMinPen}
          style={{ width: '100%' }}
          name='blueMinPen'
          min={0}
          onChange={(value) => handleUpdates('blueMinPen', value)}
        />
      </Col>
      <Col xs={24} sm={12} md={6}>
        <div style={{ marginBottom: 4 }}>Red Score</div>
        <InputNumber
          value={match?.redScore}
          style={{ width: '100%' }}
          name='redScore'
          min={0}
          onChange={(value) => handleUpdates('redScore', value)}
        />
      </Col>
      <Col xs={24} sm={12} md={6}>
        <div style={{ marginBottom: 4 }}>Blue Score</div>
        <InputNumber
          value={match?.blueScore}
          style={{ width: '100%' }}
          name='blueScore'
          min={0}
          onChange={(value) => handleUpdates('blueScore', value)}
        />
      </Col>
      <Col xs={24} sm={12} md={6}>
        <div style={{ marginBottom: 4 }}>Red Tech Fouls</div>
        <InputNumber
          value={match?.redMajPen}
          style={{ width: '100%' }}
          name='redMajPen'
          min={0}
          onChange={(value) => handleUpdates('redMajPen', value)}
        />
      </Col>
      <Col xs={24} sm={12} md={6}>
        <div style={{ marginBottom: 4 }}>Blue Tech Fouls</div>
        <InputNumber
          value={match?.blueMajPen}
          style={{ width: '100%' }}
          name='blueMajPen'
          min={0}
          onChange={(value) => handleUpdates('blueMajPen', value)}
        />
      </Col>
      <Col xs={24} sm={12} md={6}>
        <div style={{ marginBottom: 4 }}>Field Number</div>
        <InputNumber
          value={match?.fieldNumber}
          style={{ width: '100%' }}
          name='fieldNumber'
          min={0}
          onChange={(value) => handleUpdates('fieldNumber', value)}
        />
      </Col>
    </Row>
  );
};
