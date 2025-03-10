import { FC, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { LoginButton } from 'src/components/buttons/login-button';
import { LogoutButton } from 'src/components/buttons/logout-button';
import { appbarConfigAtom, userAtom } from '@stores/recoil';
import emsAvatar from '@assets/favicon.ico';

import SettingsIcon from '@mui/icons-material/Settings';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

const PrimaryAppbar: FC = () => {
  const [fullscreen, setFullscreen] = useState(false);
  const { title, titleLink, showSettings, showFullscreen } =
    useRecoilValue(appbarConfigAtom);
  const user = useRecoilValue(userAtom);

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
