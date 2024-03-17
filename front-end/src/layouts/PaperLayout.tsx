import { FC, ReactNode, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { Breakpoint } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import LoginButton from 'src/components/buttons/LoginButton/LoginButton';
import { userAtom } from '@stores/NewRecoil';
import emsAvatar from '@assets/favicon.ico';
import LogoutButton from 'src/components/buttons/LogoutButton/LogoutButton';

import SettingsIcon from '@mui/icons-material/Settings';

interface Props {
  title?: string;
  titleLink?: string;
  header?: ReactNode | string;
  containerWidth?: Breakpoint | false;
  children?: ReactNode;
  padding?: boolean;
  showSettings?: boolean;
}

const PaperLayout: FC<Props> = ({
  title,
  titleLink,
  header,
  containerWidth,
  children,
  padding,
  showSettings
}: Props) => {
  const user = useRecoilValue(userAtom);
  const navigate = useNavigate();
  const openSettings = () => {
    navigate('/global-settings');
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
              {showSettings && (
                <IconButton
                  size='large'
                  edge='start'
                  color='inherit'
                  aria-label='open drawer'
                  sx={{ ml: 1, mr: 1 }}
                  onClick={openSettings}
                >
                  <SettingsIcon />
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
      <Container
        maxWidth={containerWidth || 'xl'}
        sx={{ marginTop: (theme) => theme.spacing(12) }}
      >
        <Paper>
          {header && (
            <>
              <Box sx={{ padding: (theme) => theme.spacing(2) }}>{header}</Box>
              <Divider />
            </>
          )}
          <Box
            sx={{
              padding: padding ? (theme) => theme.spacing(2) : 0,
              position: 'relative'
            }}
          >
            <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default PaperLayout;
