import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { post } from '../api/index';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  AppBar,
  Toolbar,
} from '@mui/material';
import bgImage from '../../resources/bg.jpg';
import Storage from '../storage/index';
import logo from '../../resources/logo.png';
import { useTranslation } from 'react-i18next';


function BasicLogin() {
  const [mobilePhone, setMobilePhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await post('/auth/login', {
        mobile_phone: mobilePhone,
        password: password
      });

      const { access_token, user } = response.data;
      
      await Storage.set('token', access_token);
      await Storage.set('user', JSON.stringify(user));

      navigate('/home');
    } catch (error) {
      setError(error.message || 'An error occurred during login');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: `url(${bgImage})`,
        backgroundRepeat: 'no-repeat',
        backgroundColor: (t) =>
          t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <AppBar 
        position="static" 
        elevation={0}
        sx={{
          backgroundColor: 'transparent',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'white',
          backdropFilter: 'blur(8px)',
          background: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <img src={logo} alt="Logo" style={{ height: '32px', marginRight: '8px' }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
              {t('appName')}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Container component="main" maxWidth="xs" sx={{ mt: 8, mb: 4 }}>
        <Paper 
          elevation={6} 
          sx={{ 
            p: 4, 
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Typography 
            component="h1" 
            variant="h5" 
            align="center" 
            gutterBottom
            sx={{ 
              color: '#1a237e',
              fontWeight: 500,
              mb: 3 
            }}
          >
            Login
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="mobilePhone"
              label="Mobile Phone"
              name="mobilePhone"
              autoComplete="tel"
              autoFocus
              value={mobilePhone}
              onChange={(e) => setMobilePhone(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(0, 0, 0, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                },
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(0, 0, 0, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                },
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mt: 3, 
                mb: 2,
                backgroundColor: '#1a237e',
                '&:hover': {
                  backgroundColor: '#0d47a1',
                },
                height: '48px',
                fontSize: '1rem',
                textTransform: 'none',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              }}
            >
              Login
            </Button>
            <Typography
              variant="body2"
              align="center"
              sx={{
                color: 'rgba(0, 0, 0, 0.6)',
                mt: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                padding: '8px',
                borderRadius: '4px',
                border: '1px dashed rgba(0, 0, 0, 0.2)'
              }}
            >
              Account: demo@tingqi.xyz<br />
              Password: demo@123456
            </Typography>
          </Box>
        </Paper>
      </Container>

      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          backgroundColor: 'transparent',
        }}
      >
        <Container maxWidth="sm">
          <Typography 
            variant="body2" 
            align="center"
            sx={{
              color: 'white',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            }}
          >
            © {new Date().getFullYear()} {t('appName')}. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}

export default BasicLogin;
