import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, List, ListItem, ListItemText, Divider, 
  Paper, Avatar, Grid, Box, Chip, CircularProgress,
  Dialog, DialogContent, AppBar, Toolbar, IconButton, Button,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { get } from '../api/index';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useNavigate } from 'react-router-dom';
import Storage from '../storage/index'; // Add this import
import SchoolIcon from '@mui/icons-material/School';
import AssessmentIcon from '@mui/icons-material/Assessment';
import LogoutIcon from '@mui/icons-material/Logout';
import ClassIcon from '@mui/icons-material/Class';
import { useTranslation } from 'react-i18next';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const IconWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(1),
  '& > svg': {
    marginRight: theme.spacing(1),
    color: theme.palette.primary.main,
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
  border: 0,
  borderRadius: 30,
  boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
  color: 'white',
  padding: '12px 30px',
  minWidth: '180px',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    background: 'linear-gradient(45deg, #21CBF3 30%, #2196F3 90%)',
    transform: 'scale(1.05)',
    boxShadow: '0 6px 10px 2px rgba(33, 203, 243, .3)',
  },
}));

const LogoutButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(45deg, #FF5555 30%, #FF8A80 90%)',
  border: 0,
  borderRadius: 20,
  boxShadow: '0 3px 5px 2px rgba(255, 85, 85, .3)',
  color: 'white',
  padding: '8px 22px',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    background: 'linear-gradient(45deg, #FF8A80 30%, #FF5555 90%)',
    transform: 'scale(1.05)',
    boxShadow: '0 6px 10px 2px rgba(255, 85, 85, .3)',
  },
}));

const User = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const fetchUser = async () => {
      const storedUserString = await Storage.get('user');
      if (storedUserString) {
        const storedUser = JSON.parse(storedUserString);
        setUser(storedUser);

        try {
          const data = await get(`/users/${storedUser.id}`);
          if (data.status === 'success') {
            setUser(prevUser => ({ ...prevUser, ...data.data }));
          }
        } catch (error) {
          console.error('Error fetching data:', error);
          setError(error.message);
        }
      }
    };

    fetchUser();
  }, []);

  if (error) {
    return (
      <Container maxWidth="md">
        <Typography color="error" variant="h6" align="center" sx={{ mt: 4 }}>
          Error: {error}
        </Typography>
      </Container>
    );
  }

  if (!user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  const handleLogout = async () => {
    await Storage.remove('token');
    await Storage.remove('user');
    navigate('/login'); // Redirect to login page
  };

  return (
    <Container maxWidth="md">
      <StyledPaper elevation={3}>
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main' }}>
              <PersonIcon sx={{ fontSize: 50 }} />
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h4" gutterBottom>{user.full_name}</Typography>
            <IconWrapper>
              <PhoneIcon />
              <Typography variant="body1">{user.mobile_phone}</Typography>
            </IconWrapper>
            <IconWrapper>
              <CalendarTodayIcon />
              <Typography variant="body1">
                {t('joined')}: {new Date(user.created_at).toLocaleDateString()}
              </Typography>
            </IconWrapper>
          </Grid>
          <Grid item>
            <LogoutButton
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
            >
              {t('logout')}
            </LogoutButton>
          </Grid>
        </Grid>
      </StyledPaper>

      <StyledPaper elevation={3}>
        <Grid 
          container 
          spacing={3} 
          justifyContent="center"
          sx={{ py: 2 }}
        >
          <Grid item>
            <StyledButton 
              size="large"
              onClick={() => navigate('/user-lessons')}
              startIcon={<SchoolIcon />}
            >
              {t('my-lessons')}
            </StyledButton>
          </Grid>
          <Grid item>
            <StyledButton 
              size="large"
              onClick={() => navigate('/user-learning-result')}
              startIcon={<AssessmentIcon />}
            >
              {t('my-learning')}
            </StyledButton>
          </Grid>
        </Grid>
      </StyledPaper>
    </Container>
  );
};

export default User;
