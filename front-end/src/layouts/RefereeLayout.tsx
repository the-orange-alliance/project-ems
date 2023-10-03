import { FC, ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { Breakpoint } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import LoginButton from '@features/components/LoginButton/LoginButton';
import { userAtom } from '@stores/NewRecoil';
import emsAvatar from '@assets/favicon.ico';
import LogoutButton from '@features/components/LogoutButton/LogoutButton';

import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

interface Props {
  title?: string;
  titleLink?: string;
  containerWidth?: Breakpoint | false;
  children?: ReactNode;
}

const RefereeLayout: FC<Props> = ({
  title,
  titleLink,
  containerWidth,
  children
}: Props) => {
  const [fullscreen, setFullscreen] = useState(false);
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
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
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
            </>
          ) : (
            <>
              <LoginButton />
            </>
          )}
        </Toolbar>
      </AppBar>
      <Container
        maxWidth={containerWidth || 'xl'}
        sx={{ marginTop: (theme) => theme.spacing(12) }}
      >
        {children}
      </Container>
    </Box>
  );
};

export default RefereeLayout;
