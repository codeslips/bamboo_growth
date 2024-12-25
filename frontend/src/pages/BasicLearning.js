import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import LessonPage from '../components/page/LessonPage';

  const BasicLearning = ({ lesson, mode }) => {
console.log('lesson', lesson);


  return (
    <Box>
      <LessonPage
        mode={mode}
        lesson={lesson}
      />
      
      <Box mt={3}>
        <Typography variant="h6" gutterBottom>
        </Typography>
      </Box>
    </Box>
  );
};

export default BasicLearning;
