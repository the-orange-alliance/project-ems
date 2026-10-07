import { FC } from 'react';
import { Row, Col } from 'antd';
import { PrestartButton } from './prestart-button.js';
import { DisplaysButton } from './displays-button.js';
import { FieldPrepButton } from './field-prep-button.js';
import { StartMatchButton } from './start-match-button.js';
import { CommitScoresButton } from './commit-scores-button.js';
import { PostResultsButton } from './post-results-button.js';

// In match-flow order.
const STEPS = [
  PrestartButton,
  DisplaysButton,
  FieldPrepButton,
  StartMatchButton,
  CommitScoresButton,
  PostResultsButton
];

export const MatchControl: FC = () => (
  <Row gutter={[8, 8]}>
    {STEPS.map((Step, i) => (
      <Col key={i} xs={12} md={8} xl={4}>
        <Step />
      </Col>
    ))}
  </Row>
);
