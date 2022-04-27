import { FC, ReactNode, useState, forwardRef } from 'react';
import { NavLink, NavLinkProps } from 'react-router-dom';
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
import ListItemLink from '../list-item-link/list-item-link';
import { AppRoute } from '../../AppRoutes';

const drawerWidth = 240;

const NavButtonLink = forwardRef<any, NavLinkProps>((props, ref) => {
  return (
    <NavLink
      ref={ref}
      className={({ isActive }) => (isActive ? `active center` : 'center')}
      {...props}
    />
  );
});

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
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, height: '48px' }}
      >
        <Toolbar sx={{ padding: { md: 0, minHeight: '48px !important' } }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              color='inherit'
              aria-label='open drawer'
              onClick={toggleDrawer}
              edge='start'
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant='h6' noWrap component='div' className='center'>
              Event Management System
            </Typography>
          </Box>

          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              flexGrow: 1,
              height: '48px'
            }}
          >
            {routes.map((route) => (
              <Button
                key={route.name}
                sx={{
                  color: 'white',
                  display: 'block',
                  '&.active': {
                    backgroundColor: (theme) => theme.palette.primary.dark
                  }
                }}
                fullWidth
                component={NavButtonLink}
                to={route.path}
                className='center'
              >
                {route.name}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box'
          },
          display: { xs: 'flex', md: 'none' }
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
