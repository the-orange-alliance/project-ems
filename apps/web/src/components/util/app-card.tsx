import { FC, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Col, Divider, Row, Skeleton, Typography } from 'antd';
import { useAtomValue } from 'jotai';

import firstLogo from 'src/assets/images/first-logo.png';
import firstLogoDarkMode from 'src/assets/images/first-logo-reverse.png';
import { darkModeAtom } from 'src/stores/state/index.js';
import { AppRoute } from 'src/app-routes.js';
import { useCurrentEvent } from 'src/api/use-event-data.js';

export interface AppCardProps {
  title: string;
  to?: string;
  href?: string;
  imgSrc?: string;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const AppCard: FC<AppCardProps> = ({
  title,
  to,
  href,
  imgSrc,
  loading,
  icon
}) => {
  const darkMode = useAtomValue(darkModeAtom);
  const content = (
    <div
      style={{
        position: 'relative',
        width: '100%',
        paddingTop: '100%'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundImage: `url(${!icon ? (imgSrc ? imgSrc : darkMode ? firstLogoDarkMode : firstLogo) : ''})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            marginBottom: 16
          }}
        />
        {icon ? icon : null}
        <Typography.Text style={{ textAlign: 'center', width: '100%' }}>
          {title}
        </Typography.Text>
      </div>
    </div>
  );

  return (
    <Card style={{ width: '100%', flexBasis: '10%' }} hoverable>
      {loading ? (
        <Skeleton />
      ) : to ? (
        <Link to={to} style={{ display: 'block' }}>
          {content}
        </Link>
      ) : href ? (
        <a href={href} style={{ display: 'block' }}>
          {content}
        </a>
      ) : (
        content
      )}
    </Card>
  );
};

export const AppRow: FC<{ route: AppRoute }> = ({ route }) => {
  const { data: event, isLoading } = useCurrentEvent();
  return (
    <Link
      to={`${route.path.replaceAll(':eventKey', event?.eventKey ?? '')}`}
      style={{ cursor: 'pointer' }}
    >
      <Row gutter={[24, 24]} style={{ marginBottom: 8 }}>
        {!isLoading && (
          <>
            <Col style={{ marginRight: 'auto' }}>
              <Typography.Title
                level={4}
                style={{ width: '100%', display: 'flex', alignItems: 'center' }}
              >
                {route.icon ? <>{route.icon}&nbsp;</> : null}
                {route.name}
              </Typography.Title>
            </Col>
            {route.eventListRenderer && (
              <Col>
                <Suspense fallback={<Skeleton active />}>
                  <route.eventListRenderer />
                </Suspense>
              </Col>
            )}
            <Col>
              <Button>Edit</Button>
            </Col>
          </>
        )}
        {isLoading && (
          <>
            <Col style={{ marginRight: 'auto' }}>
              <Skeleton.Button active style={{ width: 200 }} />
            </Col>
            <Col>
              <Skeleton.Button active style={{ width: 100 }} />
            </Col>
          </>
        )}
      </Row>
      <Divider />
    </Link>
  );
};
