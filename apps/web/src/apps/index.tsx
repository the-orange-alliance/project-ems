import { FC, Suspense, useMemo } from 'react';
import { Row, Col, Divider } from 'antd';
import { DefaultLayout } from '@layouts/default-layout.js';
import { AppCard, AppCardProps, AppRow } from '@components/util/app-card.js';
import routes from '../app-routes.js';
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
  const buildType = import.meta.env.VITE_BUILD_TYPE;
  const filteredRoutes = useMemo(
    () =>
      routes.filter((route) =>
        buildType === 'production' ? route.online !== false : true
      ),
    [routes, buildType]
  );
  return (
    <>
      <Row gutter={[24, 24]} style={{ marginBottom: 16 }} justify={'center'}>
        <Col
          xs={24}
          sm={20}
          md={16}
          style={{ width: '100%', marginBottom: 16 }}
        >
          {filteredRoutes
            .filter((route) => route.eventOrder)
            .sort((a, b) => (a.eventOrder ?? 0) - (b.eventOrder ?? 0))
            .map((route) => (
              <AppRow key={route.path} route={route} />
            ))}
        </Col>
      </Row>
      <Divider>Other Apps</Divider>
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        {filteredRoutes
          .filter((route) => !route.hidden && !route.eventOrder)
          .map((route, i) => (
            <ColAppCard
              key={`route-${i}`}
              title={route.name}
              to={`${route.path.replaceAll(':eventKey', event?.eventKey ?? '')}`}
              imgSrc={route.image ? route.image : undefined}
              loading={isLoading}
            />
          ))}
      </Row>
    </>
  );
};

export default AppCards;
