import { FC, Suspense } from 'react';
import { Row, Col } from 'antd';
import { DefaultLayout } from '@layouts/default-layout.js';
import { AppCard, AppCardProps } from '@components/util/app-card.js';
import AppRoutes from '../app-routes.js';
import { useCurrentEvent } from '@api/use-event-data.js';

const ColAppCard = (props: AppCardProps) => (
  <Col xs={10} md={6} lg={4}>
    <AppCard {...props} />
  </Col>
);

const HomeApp: FC = () => {
  const { data: event } = useCurrentEvent();

  return !event ? (
    <Suspense>
      <DefaultLayout title='NO EVENT FOUND'>
        <div>
          Could not load event details. Please refresh the page or re-select the
          event.
        </div>
      </DefaultLayout>
    </Suspense>
  ) : (
    <Suspense>
      <DefaultLayout title={event?.eventName}>
        <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
          {AppRoutes.filter((route) => !route.hidden).map((route, i) => (
            <ColAppCard
              key={`route-${i}`}
              title={route.name}
              to={`${route.path.replaceAll(':eventKey', event?.eventKey)}`}
              imgSrc={route.image ? route.image : undefined}
            />
          ))}
        </Row>
      </DefaultLayout>
    </Suspense>
  );
};

export default HomeApp;
