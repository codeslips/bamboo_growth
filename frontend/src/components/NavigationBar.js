import React, { useState, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Button, 
  Typography, 
  Avatar, 
  IconButton, 
  Box, 
  CircularProgress,
  Drawer,
  List,
  ListItem,
  ListItemText,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  Popper,
  ClickAwayListener,
  Paper,
  Grow
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import MenuIcon from '@mui/icons-material/Menu';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import logo from '../../resources/logo.png';
import SchoolIcon from '@mui/icons-material/School';
import ClassIcon from '@mui/icons-material/Class';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import GroupIcon from '@mui/icons-material/Group';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BarChartIcon from '@mui/icons-material/BarChart';
import FolderIcon from '@mui/icons-material/Folder';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PetsIcon from '@mui/icons-material/Pets';
import TranslateIcon from '@mui/icons-material/Translate';
import OnlineLearningIcon from '@mui/icons-material/OnlinePrediction';
import GitHubIcon from '@mui/icons-material/GitHub';

const defaultAppBarSx = {
  backgroundColor: 'white',
  borderBottom: '1px solid',
  borderColor: 'grey.100',
  color: 'primary.main',
  backdropFilter: 'blur(20px)',
  background: 'rgba(255, 255, 255, 0.85)',
  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.03)',
};

function NavigationBar() {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreButtonRef = useRef(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMoreMouseEnter = () => {
    setMoreMenuOpen(true);
  };

  const handleMoreMouseLeave = () => {
    setMoreMenuOpen(false);
  };

  const navButtonStyle = {
    color: 'primary.main',
    textDecoration: 'none',
    px: 3,
    py: 1.5,
    borderRadius: 3,
    transition: 'all 0.2s ease-in-out',
    position: 'relative',
    '&.active': {
      fontWeight: '500',
      backgroundColor: 'rgba(25, 118, 210, 0.08)',
      '&::after': {
        content: '""',
        position: 'absolute',
        bottom: '0',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '30%',
        height: '3px',
        borderRadius: '2px',
        backgroundColor: 'primary.main',
      }
    },
    '&:hover': {
      backgroundColor: 'rgba(25, 118, 210, 0.06)',
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 8px rgba(25, 118, 210, 0.15)',
    },
  };

  const mobileNavButtonStyle = {
    width: '100%',
    textAlign: 'left',
    py: 2,
    px: 3,
    borderRadius: 2,
    transition: 'all 0.2s ease-in-out',
    '&.active': {
      backgroundColor: 'rgba(25, 118, 210, 0.08)',
      fontWeight: '500',
      borderLeft: '4px solid',
      borderColor: 'primary.main',
    },
    '&:hover': {
      backgroundColor: 'rgba(25, 118, 210, 0.06)',
    },
  };

  const navigationItems = [
    ...(user && user.role && user.role !== 'student'
      ? [
          //{ to: '/course-list', label: t('course'), icon: <SchoolIcon /> },      
          { to: '/lessons-list', label: t('lessons'), icon: <MenuBookIcon /> },
          { to: '/groups', label: t('groups'), icon: <GroupIcon /> },
        ]
      : []),
    { to: '/user-lessons', label: t('my-lessons'), icon: <AssignmentIcon /> },
    { to: '/user-learning-result', label: t('my-learning'), icon: <BarChartIcon /> },
  ];

  const moreNavigationItems = [
    ...(user && user.role && user.role == 'admin'
      ? [
          { to: '/resources', label: t('resources'), icon: <FolderIcon /> },
          { to: '/user-management', label: t('users'), icon: <PeopleIcon /> },
          { to: '/lesson-types', label: t('lesson-types'), icon: <ClassIcon /> },    
          { href: 'https://www.coursera.org/', label: t('coursera'), icon: <OnlineLearningIcon /> },
          { href: 'https://github.com/trending', label: t('trending'), icon: <GitHubIcon /> },
          { href: 'https://github.com/codeslips/bamboo_growth', label: t('Github'), icon: <GitHubIcon /> },
        ]
      : [
          { href: 'https://www.coursera.org/', label: t('coursera'), icon: <OnlineLearningIcon /> },
          { href: 'https://github.com/trending', label: t('trending'), icon: <GitHubIcon /> },
          { href: 'https://github.com/codeslips/bamboo_growth', label: t('Github'), icon: <GitHubIcon /> },
      ]),
  ];

  const renderNavigationItems = (mobile = false) => {
    if (mobile) {
      return (
        <List>
          {navigationItems.map((item) => (
            <ListItem key={item.to || item.href} disablePadding>
              <Button
                component={item.to ? NavLink : 'a'}
                to={item.to}
                href={item.href}
                target={item.href ? '_blank' : undefined}
                rel={item.href ? 'noopener noreferrer' : undefined}
                sx={mobileNavButtonStyle}
                onClick={handleDrawerToggle}
              >
                <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                  {item.icon}
                </Box>
                <ListItemText 
                  primary={item.label} 
                  primaryTypographyProps={{ 
                    sx: { textTransform: 'none' } 
                  }} 
                />
              </Button>
            </ListItem>
          ))}
        </List>
      );
    }

    return navigationItems.map((item) => (
      <Button
        key={item.to || item.href}
        color="inherit"
        component={item.to ? NavLink : 'a'}
        to={item.to}
        href={item.href}
        target={item.href ? '_blank' : undefined}
        rel={item.href ? 'noopener noreferrer' : undefined}
        sx={{
          ...navButtonStyle,
          textTransform: 'none'
        }}
        startIcon={item.icon}
      >
        {item.label}
      </Button>
    ));
  };

  if (isLoading) {
    return (
      <AppBar position="static" sx={defaultAppBarSx}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress color="primary" size={24} />
        </Toolbar>
      </AppBar>
    );
  }

  return (
    <>
      <AppBar 
        position="static" 
        elevation={0}
        color="default"
        sx={defaultAppBarSx}
      >
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <Box
              component="div"
              onClick={isMobile ? handleDrawerToggle : undefined}
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: isMobile ? 'pointer' : 'default'
              }}
            >
              <img src={logo} alt={t('appName')} style={{ height: '32px', marginRight: '8px' }} />
            </Box>
          </Box>
          
          {isMobile ? null : (
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                flexGrow: 1,
                gap: 2,
                mx: 4,
                overflow: 'auto',
              }}
            >
              {renderNavigationItems()}
              <Box
                onMouseEnter={handleMoreMouseEnter}
                onMouseLeave={handleMoreMouseLeave}
                ref={moreButtonRef}
              >
                <Button
                  color="inherit"
                  sx={{
                    ...navButtonStyle,
                    textTransform: 'none',
                    backgroundColor: moreMenuOpen ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                  }}
                  startIcon={<MoreHorizIcon />}
                >
                  {t('more')}
                </Button>
                <Popper
                  open={moreMenuOpen}
                  anchorEl={moreButtonRef.current}
                  placement="bottom-start"
                  transition
                  sx={{ zIndex: 1300 }}
                >
                  {({ TransitionProps }) => (
                    <Grow {...TransitionProps}>
                      <Paper
                        sx={{
                          mt: 1,
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                          borderRadius: 2,
                        }}
                      >
                        {moreNavigationItems.map((item) => (
                          <MenuItem
                            key={item.to || item.href}
                            component={item.to ? NavLink : 'a'}
                            to={item.to}
                            href={item.href}
                            target={item.href ? '_blank' : undefined}
                            rel={item.href ? 'noopener noreferrer' : undefined}
                            sx={{
                              py: 1,
                              px: 2,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              '&.active': {
                                backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                '& .MuiSvgIcon-root': {
                                  color: 'primary.main',
                                }
                              },
                            }}
                          >
                            {item.icon}
                            <Typography sx={{ color: 'text.primary' }}>
                              {item.label}
                            </Typography>
                          </MenuItem>
                        ))}
                      </Paper>
                    </Grow>
                  )}
                </Popper>
              </Box>
            </Box>
          )}

          <IconButton
            color="primary"
            component={NavLink}
            to="/user"
            aria-label={t('userProfile')}
            sx={{ 
              flexShrink: 0,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'scale(1.1)',
              }
            }}
          >
            <Avatar sx={{ 
              width: 36, 
              height: 36, 
              bgcolor: 'primary.light',
              color: 'primary.main',
              boxShadow: '0 2px 8px rgba(25, 118, 210, 0.2)',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                bgcolor: 'primary.main',
                color: 'white',
              }
            }}>
              <PersonIcon />
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: 280,
            boxShadow: '4px 0 24px rgba(0, 0, 0, 0.08)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mb: 3,
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'grey.100',
          }}>
            <img src={logo} alt="Tips Logo" style={{ height: '36px', marginRight: '12px' }} />
            <Typography variant="h6" component="div" sx={{ fontWeight: 500 }}>
              Tips
            </Typography>
          </Box>
          {renderNavigationItems(true)}
        </Box>
      </Drawer>
    </>
  );
}

export default NavigationBar;
