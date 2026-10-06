import { FC, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoginButton } from 'src/components/buttons/login-button.js';
import emsAvatar from '@assets/favicon.ico';
import {
  Layout,
  Avatar,
  Typography,
  Button,
  Dropdown,
  Grid,
  theme
} from 'antd';
import {
  SettingOutlined,
  ToolOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useAtomValue } from 'jotai';
import { appbarConfigAtom } from 'src/stores/state/ui.js';
import { eventKeyAtom } from 'src/stores/state/event.js';
import { ConnectionChip } from '../util/connection-chip.js';
import { VersionChip } from '../util/version-chip.js';
import {
  toMenuItems,
  useProductionOptionsItems
} from 'src/apps/scorekeeper/hooks/use-production-options.js';
import { MetadataChips } from '../util/metadata-chips.js';

const { Header } = Layout;

const PrimaryAppbar: FC = () => {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const isCompact = !screens.lg;
  const [fullscreen, setFullscreen] = useState(false);
  const { title, titleLink, showFullscreen } = useAtomValue(appbarConfigAtom);
  const user = true; // useAtomValue(userAtom);
  const eventKey = useAtomValue(eventKeyAtom);
  const navigate = useNavigate();
  const productionOptionsItems = useProductionOptionsItems();

  // The header bar is always the primary green in both themes, so its text is
  // white in both. (Previously it borrowed `colorTextSecondary`, which forced
  // that token to an inverted value and broke secondary text everywhere else.)
  const headerFg = '#ffffff';

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

  const buttonSize = isMobile ? 'middle' : 'large';
  const buttonMargin = isMobile ? '4px' : '8px';
  const titleText =
    title ||
    `Event Management System${import.meta.env.VITE_BUILD_TYPE === 'production' ? ' - online' : ''}`;
  const titleNode = (
    <Typography.Title
      level={isMobile ? 5 : 3}
      ellipsis={{ tooltip: titleText }}
      style={{ color: headerFg, margin: 0 }}
    >
      {titleText}
    </Typography.Title>
  );

  return (
    <Header
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: isMobile ? '10px 8px' : '10px 16px',
        gap: isMobile ? '4px' : 0,
        background: token.colorPrimary,
        color: headerFg
      }}
    >
      <Link
        to='/'
        style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
      >
        <Avatar
          src={emsAvatar}
          alt='Event Management System Logo'
          style={{ marginRight: isMobile ? 0 : '8px' }}
          size={isMobile ? 'default' : 'large'}
          shape='square'
        />
      </Link>
      {titleLink ? (
        <Link to={titleLink} style={{ flex: '1 1 0', minWidth: 0 }}>
          {titleNode}
        </Link>
      ) : (
        <div style={{ flex: '1 1 0', minWidth: 0 }}>{titleNode}</div>
      )}
      <div
        style={{
          gap: '8px',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0
        }}
      >
        <ConnectionChip iconOnly={isCompact} />
        <VersionChip iconOnly={isCompact} />
        <MetadataChips iconOnly={isCompact} />
      </div>
      {user ? (
        <>
          {/* <Button type='link'>Docs</Button> */}

          {/* Production Options */}
          {!showFullscreen && (
            <Dropdown
              menu={{ items: toMenuItems(productionOptionsItems) }}
              trigger={['click']}
            >
              <Button
                icon={isCompact ? <ToolOutlined /> : undefined}
                aria-label='Production Options'
                style={{ marginLeft: buttonMargin, flexShrink: 0 }}
                size={buttonSize}
              >
                {!isCompact && 'Production Options'}
              </Button>
            </Dropdown>
          )}

          {/* Settings */}
          {!showFullscreen && (
            <Button
              icon={<SettingOutlined />}
              aria-label='Settings'
              style={{ marginLeft: buttonMargin, flexShrink: 0 }}
              onClick={navSettings}
              size={buttonSize}
            >
              {!isCompact && 'Settings'}
            </Button>
          )}

          {showFullscreen && (
            <Button
              icon={<ReloadOutlined />}
              aria-label='Refresh'
              style={{ marginLeft: buttonMargin, flexShrink: 0 }}
              onClick={() => location.reload()}
              size={buttonSize}
            >
              {!isCompact && 'Refresh'}
            </Button>
          )}

          {/* Fullscreen Toggle */}
          {showFullscreen && (
            <Button
              icon={
                fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />
              }
              aria-label='Fullscreen'
              style={{ marginLeft: buttonMargin, flexShrink: 0 }}
              onClick={fullscreen ? exitFullscreen : requestFullscreen}
              size={buttonSize}
            >
              {!isCompact && 'Fullscreen'}
            </Button>
          )}
        </>
      ) : (
        <LoginButton />
      )}
    </Header>
  );
};

export default PrimaryAppbar;
