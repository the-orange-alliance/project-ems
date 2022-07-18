import { FC, ReactNode } from 'react';
import { Link } from 'react-router-dom';
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

import NotificationsIcon from '@mui/icons-material/Notifications';
import emsAvatar from '../assets/favicon.ico';
interface Props {
  containerWidth?: Breakpoint | false;
  children?: ReactNode;
}

const DefaultLayout: FC<Props> = ({ containerWidth, children }: Props) => {
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
          <Button color='inherit'>Docs</Button>
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

export default DefaultLayout;
