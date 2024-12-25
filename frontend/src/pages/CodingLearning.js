import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import LessonPage from '../components/page/LessonPage';

  const CodingLearning = ({ lesson, mode }) => {

  return (
    <Box>
      <LessonPage
        mode={mode}
        lesson={lesson}
      />
    </Box>
  );
};

export default CodingLearning;
