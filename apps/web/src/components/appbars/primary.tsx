import { FC, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoginButton } from 'src/components/buttons/login-button.js';
import { LogoutButton } from 'src/components/buttons/logout-button.js';
import emsAvatar from '@assets/favicon.ico';
import { Layout, Avatar, Typography, Button, theme } from 'antd';
import {
  SettingOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined
} from '@ant-design/icons';
import { useAtomValue } from 'jotai';
import { appbarConfigAtom, userAtom } from 'src/stores/state/ui.js';
import { eventKeyAtom } from 'src/stores/state/event.js';
import { ConnectionChip } from '../util/connection-chip.js';

const { Header } = Layout;

const PrimaryAppbar: FC = () => {
  const { token } = theme.useToken();
  const [fullscreen, setFullscreen] = useState(false);
  const { title, titleLink, showSettings, showFullscreen } =
    useAtomValue(appbarConfigAtom);
  const user = useAtomValue(userAtom);
  const eventKey = useAtomValue(eventKeyAtom);
  const navigate = useNavigate();

  const navSettings = () => {
    // get user's current location
    const currentPath = window.location.pathname;
    const split = currentPath.split('/');
    // if they're currently in the path of an event, just make the URL still point to the event /settings.  It all goes to the same place
    if (split.length > 1 && split[1] === eventKey) {
      navigate(`/${eventKey}/settings`);
    } else {
      navigate('/settings');
    }
  };

  const requestFullscreen = () => {
    document.documentElement.requestFullscreen();
    setFullscreen(true);
  };
  const exitFullscreen = () => {
    document.exitFullscreen();
    setFullscreen(false);
  };

  return (
    <Header
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        background: token.colorPrimary,
        color: token.colorTextSecondary
      }}
    >
      <Link to='/' style={{ display: 'flex', alignItems: 'center' }}>
        <Avatar
          src={emsAvatar}
          alt='Event Management System Logo'
          style={{ marginRight: '8px' }}
          size='large'
          shape='square'
        />
      </Link>
      {titleLink ? (
        <Link to={titleLink} style={{ flexGrow: 1 }}>
          <Typography.Title
            level={3}
            style={{ color: token.colorTextSecondary, margin: 0 }}
          >
            {title ||
              `Event Management System${import.meta.env.VITE_BUILD_TYPE === 'production' ? ' - online' : ''}`}
          </Typography.Title>
        </Link>
      ) : (
        <Typography.Title
          level={3}
          style={{ flexGrow: 1, margin: 0, color: token.colorTextSecondary }}
        >
          {title ||
            `Event Management System${import.meta.env.VITE_BUILD_TYPE === 'production' ? ' - online' : ''}`}
        </Typography.Title>
      )}
      <ConnectionChip />
      {user ? (
        <>
          {/* <Button type='link'>Docs</Button> */}

          {/* Settings */}
          <Button
            icon={<SettingOutlined />}
            style={{ marginLeft: '8px' }}
            onClick={navSettings}
          />

          {/* Fullscreen Toggle */}
          {showFullscreen && (
            <Button
              type='text'
              icon={
                fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />
              }
              style={{ marginLeft: '8px' }}
              onClick={fullscreen ? exitFullscreen : requestFullscreen}
            />
          )}

          {/* Logout */}
          <LogoutButton />
        </>
      ) : (
        <LoginButton />
      )}
    </Header>
  );
};

export default PrimaryAppbar;
