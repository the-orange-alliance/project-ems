import { FC, Suspense, useEffect } from 'react';
import { Row, Col } from 'antd';
import { DefaultLayout } from '@layouts/default-layout.js';
import { AppCard, AppCardProps } from '@components/util/app-card.js';
import AppRoutes from '../app-routes.js';
import { useCurrentEvent } from '@api/use-event-data.js';
import { useUpdateAppbar } from 'src/hooks/use-update-appbar.js';

const ColAppCard = (props: AppCardProps) => (
  <Col xs={10} md={6} lg={4}>
    <AppCard {...props} />
  </Col>
);

const AppCards: FC = () => {
  return (
    <DefaultLayout>
      <Suspense>
        <App />
      </Suspense>
    </DefaultLayout>
  );
};

const App = () => {
  const { data: event, isLoading } = useCurrentEvent();
  useUpdateAppbar({ title: event ? event.eventName : undefined }, [event]);
  return (
    <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
      {AppRoutes.filter((route) => !route.hidden).map((route, i) => (
        <ColAppCard
          key={`route-${i}`}
          title={route.name}
          to={`${route.path.replaceAll(':eventKey', event?.eventKey ?? '')}`}
          imgSrc={route.image ? route.image : undefined}
          loading={isLoading}
        />
      ))}
    </Row>
  );
};

export default AppCards;
