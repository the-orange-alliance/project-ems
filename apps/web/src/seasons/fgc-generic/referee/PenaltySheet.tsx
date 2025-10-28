import { Row, Col, Typography } from 'antd';
import { Alliance, Match, MatchDetailBase } from '@toa-lib/models';
import { useAtomValue } from 'jotai';
import { NumberInput } from 'src/components/inputs/number-input.js';
import { matchAtom } from 'src/stores/state/event.js';

interface Props<DetailsType extends MatchDetailBase> {
  alliance: Alliance;
  onMatchItemUpdate: <K extends keyof Match<DetailsType>>(
    key: K,
    value: Match<DetailsType>[K]
  ) => void;
}

const PenaltySheet = <DetailsType extends MatchDetailBase>({
  alliance,
  onMatchItemUpdate
}: Props<DetailsType>) => {
  const match = useAtomValue(matchAtom);

  const handleFoulChange = (minPen: number) => {
    onMatchItemUpdate(alliance === 'red' ? 'redMinPen' : 'blueMinPen', minPen);
  };

  return (
    <Row justify='center' style={{ width: '100%' }}>
      <Col
        span={24}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'center'
        }}
      >
        <Typography.Title level={5}>Minor Fouls</Typography.Title>
        <NumberInput
          value={
            (alliance === 'red' ? match?.redMinPen : match?.blueMinPen) || 0
          }
          onChange={handleFoulChange}
        />
      </Col>
      <Col
        span={24}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'center'
        }}
      >
        <Typography.Title level={5}>Major Fouls</Typography.Title>
        <NumberInput
          value={
            (alliance === 'red' ? match?.redMajPen : match?.blueMajPen) || 0
          }
          onChange={handleFoulChange}
        />
      </Col>
    </Row>
  );
};

export default PenaltySheet;
