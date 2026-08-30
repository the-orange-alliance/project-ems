import { FC } from 'react';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { Displays, MatchSocketEvent } from '@toa-lib/models';
import { Button, Col, Row, Typography } from 'antd';
import { useSocketWorker } from 'src/api/use-socket-worker.js';

export const StreamApp: FC = () => {
  const { worker } = useSocketWorker();

  const sendBlank = () =>
    worker?.emit(MatchSocketEvent.DISPLAY, Displays.BLANK);
  const sendChroma = () =>
    worker?.emit(MatchSocketEvent.DISPLAY, Displays.BLANK);
  const sendPreview = () =>
    worker?.emit(MatchSocketEvent.DISPLAY, Displays.MATCH_PREVIEW);
  const sendPlay = () =>
    worker?.emit(MatchSocketEvent.DISPLAY, Displays.MATCH_START);
  const sendResults = () =>
    worker?.emit(MatchSocketEvent.DISPLAY, Displays.MATCH_RESULTS);
  const sendRankingsRR = () =>
    worker?.emit(MatchSocketEvent.DISPLAY, Displays.RANKINGS);
  const sendRankingsF = () =>
    worker?.emit(MatchSocketEvent.DISPLAY, Displays.BLANK);

  return (
    <PaperLayout
      containerWidth='lg'
      header={<Typography.Title level={4}>Streaming App</Typography.Title>}
    >
      <Row gutter={[24, 24]} style={{ padding: 24 }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Button type='primary' block onClick={sendBlank}>
            Blank Screen
          </Button>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Button type='primary' block onClick={sendChroma}>
            Chroma Background
          </Button>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Button type='primary' block onClick={sendPreview}>
            Match Preview
          </Button>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Button type='primary' block onClick={sendPlay}>
            Match Play
          </Button>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Button type='primary' block onClick={sendResults}>
            Match Results
          </Button>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Button type='primary' block onClick={sendRankingsRR}>
            Rankings (Round Robin)
          </Button>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Button type='primary' block onClick={sendRankingsF}>
            Rankings (Finals)
          </Button>
        </Col>
      </Row>
    </PaperLayout>
  );
};
