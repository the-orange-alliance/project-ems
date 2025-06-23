import { Row, Col } from 'antd';
import { useAtomValue } from 'jotai';
import { FC } from 'react';
import { useSeasonComponents } from 'src/hooks/use-season-components.js';
import { matchAtom } from 'src/stores/state/event.js';

export const ScorekeeperDetails: FC = () => {
  const match = useAtomValue(matchAtom);
  const seasonComponents = useSeasonComponents();
  return seasonComponents && match ? (
    <Row gutter={[24, 24]}>
      <Col xs={24} sm={12}>
        <seasonComponents.RedScoreBreakdown match={match} />
      </Col>
      <Col xs={24} sm={12}>
        <seasonComponents.BlueScoreBreakdown match={match} />
      </Col>
    </Row>
  ) : null;
};
