import { FC } from 'react';
import { Row, Col } from 'antd';
import { PrestartButton } from './prestart-button.js';
import { DisplaysButton } from './displays-button.js';
import { FieldPrepButton } from './field-prep-button.js';
import { StartMatchButton } from './start-match-button.js';
import { CommitScoresButton } from './commit-scores-button.js';
import { PostResultsButton } from './post-results-button.js';

export const MatchControl: FC = () => {
  return (
    <Row gutter={[24, 24]} style={{ width: '100%' }}>
      <Col xs={24} sm={12} md={8} lg={4}>
        <PrestartButton />
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <DisplaysButton />
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <FieldPrepButton />
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <StartMatchButton />
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <CommitScoresButton />
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <PostResultsButton />
      </Col>
    </Row>
  );
};
