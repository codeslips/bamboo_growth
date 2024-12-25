import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import NavigationBar from './components/NavigationBar';
import Footer from './components/Footer';

const Layout = () => {
   return (
     <Box
       sx={{
         display: 'flex',
         flexDirection: 'column',
         minHeight: '100vh',
       }}
     >
       <NavigationBar />
       <Container component="main" sx={{ flexGrow: 1, mb: 16 }}>
         <Outlet />
       </Container>
       <Footer />
     </Box>
   );
}

export { Layout };
