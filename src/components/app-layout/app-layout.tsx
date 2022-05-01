import { FC, ReactNode, useState } from 'react';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ListItemLink from '../list-item-link/list-item-link';
import { AppRoute } from '../../AppRoutes';

const drawerWidth = 240;

interface Props {
  routes: AppRoute[];
  children?: ReactNode;
}

const AppLayout: FC<Props> = ({ routes, children }: Props) => {
  const [open, setOpen] = useState(false);

  const closeDrawer = () => {
    setOpen(false);
  };

  const toggleDrawer = () => {
    setOpen(!open);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position='fixed'
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color='inherit'
            aria-label='open drawer'
            onClick={toggleDrawer}
            edge='start'
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant='h6' noWrap style={{ flexGrow: 1 }}>
            Event Management System
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
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box'
          }
        }}
        anchor='left'
        open={open}
        onClose={closeDrawer}
      >
        <Toolbar />
        <List>
          {routes.map((route) => (
            <ListItemLink
              onClick={closeDrawer}
              key={route.name}
              to={route.path}
              primary={route.name}
              icon={route.icon}
            ></ListItemLink>
          ))}
        </List>
        <Divider />
        {/* TODO - Import affiliate icons here */}
      </Drawer>
      <Container maxWidth='xl' sx={{ marginTop: (theme) => theme.spacing(10) }}>
        {children}
      </Container>
    </Box>
  );
};

export default AppLayout;
