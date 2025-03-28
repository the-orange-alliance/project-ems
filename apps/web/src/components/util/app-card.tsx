import { FC } from 'react';
import { Link } from 'react-router-dom';
import { Card, Typography } from 'antd';
import { useAtomValue } from 'jotai';

import firstLogo from 'src/assets/images/first-logo.png';
import firstLogoDarkMode from 'src/assets/images/first-logo-reverse.png';
import { darkModeAtom } from 'src/stores/state/index.js';

export interface AppCardProps {
  title: string;
  to?: string;
  href?: string;
  imgSrc?: string;
}

export const AppCard: FC<AppCardProps> = ({ title, to, href, imgSrc }) => {
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
            backgroundImage: `url(${imgSrc ? imgSrc : darkMode ? firstLogoDarkMode : firstLogo})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            marginBottom: 16
          }}
        />
        <Typography.Text style={{ textAlign: 'center', width: '100%' }}>
          {title}
        </Typography.Text>
      </div>
    </div>
  );

  return (
    <Card style={{ width: '100%', flexBasis: '10%' }} hoverable>
      {to ? (
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
