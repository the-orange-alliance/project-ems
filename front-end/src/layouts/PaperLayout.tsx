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
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import LoginButton from 'src/features/components/LoginButton/LoginButton';
import { userAtom } from 'src/stores/Recoil';
import emsAvatar from 'src/assets/favicon.ico';
import LogoutButton from 'src/features/components/LogoutButton/LogoutButton';

import NotificationsIcon from '@mui/icons-material/Notifications';

interface Props {
  header?: ReactNode | string;
  containerWidth?: Breakpoint | false;
  children?: ReactNode;
  padding?: boolean;
}

const PaperLayout: FC<Props> = ({
  header,
  containerWidth,
  children,
  padding
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
          <Typography variant='h6' noWrap style={{ flexGrow: 1 }}>
            Event Management System | Home
          </Typography>
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
        sx={{ marginTop: (theme) => theme.spacing(12) }}
      >
        <Paper>
          {header && (
            <>
              <Box sx={{ padding: (theme) => theme.spacing(2) }}>{header}</Box>
              <Divider />
            </>
          )}
          <Box sx={{ padding: padding ? (theme) => theme.spacing(2) : 0 }}>
            {children}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default PaperLayout;
