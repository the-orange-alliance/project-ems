import { FC, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoginButton } from 'src/components/buttons/login-button.js';
import { LogoutButton } from 'src/components/buttons/logout-button.js';
import emsAvatar from '@assets/favicon.ico';
import {
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Typography,
  Button
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon
} from '@mui/icons-material';
import { useAtomValue } from 'jotai';
import { appbarConfigAtom, userAtom } from 'src/stores/state/ui.js';

const PrimaryAppbar: FC = () => {
  const [fullscreen, setFullscreen] = useState(false);
  const { title, titleLink, showSettings, showFullscreen } =
    useAtomValue(appbarConfigAtom);
  const user = useAtomValue(userAtom);

  const requestFullscreen = () => {
    document.documentElement.requestFullscreen();
    setFullscreen(true);
  };
  const exitFullscreen = () => {
    document.exitFullscreen();
    setFullscreen(false);
  };

  return (
    <AppBar position='fixed'>
      <Toolbar>
        <IconButton
          component={Link}
          to='/'
          size='small'
          sx={{ mr: 1, marginLeft: '-14px' }}
        >
          <Avatar
            alt='Event Management System Logo'
            src={emsAvatar}
            sx={{ padding: '4px' }}
          />
        </IconButton>
        {titleLink && (
          <Typography
            variant='h6'
            noWrap
            style={{ flexGrow: 1 }}
            component={Link}
            to={titleLink}
          >
            {title ? title : 'Event Management System'}
          </Typography>
        )}
        {!titleLink && (
          <Typography variant='h6' noWrap style={{ flexGrow: 1 }}>
            {title ? title : 'Event Management System'}
          </Typography>
        )}
        {user ? (
          <>
            <Button color='inherit'>Docs</Button>
            <LogoutButton />
            {showSettings && (
              <IconButton
                size='large'
                edge='start'
                color='inherit'
                aria-label='open drawer'
                sx={{ ml: 1, mr: 1 }}
                component={Link}
                to='/global-settings'
              >
                <SettingsIcon />
              </IconButton>
            )}
            {showFullscreen && (
              <IconButton
                size='large'
                edge='start'
                color='inherit'
                aria-label='open drawer'
                sx={{ ml: 1, mr: 1 }}
                onClick={fullscreen ? exitFullscreen : requestFullscreen}
              >
                {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            )}
          </>
        ) : (
          <>
            <LoginButton />
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default PrimaryAppbar;
