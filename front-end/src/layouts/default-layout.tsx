import { FC, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { Breakpoint } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { LoginButton } from 'src/components/buttons/login-button';
import { LogoutButton } from 'src/components/buttons/logout-button';
import { userAtom } from '@stores/recoil';
import emsAvatar from '@assets/favicon.ico';
import NotificationsIcon from '@mui/icons-material/Notifications';

interface Props {
  title?: string;
  titleLink?: string;
  containerWidth?: Breakpoint | false;
  children?: ReactNode;
}

export const DefaultLayout: FC<Props> = ({
  title,
  titleLink,
  containerWidth,
  children
}: Props) => {
  const user = useRecoilValue(userAtom);
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
              >
                <Badge badgeContent={2} color='error'>
                  <NotificationsIcon />
                </Badge>
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
        sx={{ marginTop: (theme) => theme.spacing(10) }}
      >
        {children}
      </Container>
    </Box>
  );
};
