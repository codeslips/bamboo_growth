import React from 'react';
import { Box, Typography, Paper, Grid, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

const LessonContentJudgeProblems = ({ content }) => {
  const problemList = typeof content === 'string' ? JSON.parse(content) : content;

  const handleProblemClick = (problemId) => {
    const url = `https://growth.tingqi.xyz//problem/${problemId}`;
    window.open(url, '_blank');
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Grid container spacing={3}>
        {problemList.map((problem, index) => (
          <Grid item xs={12} sm={6} key={index}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3,
                height: '100%',
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                  bgcolor: 'primary.50',
                },
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '4px',
                  bgcolor: problem.isOptional ? 'secondary.main' : 'primary.main',
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {problem.isOptional ? (
                  <RadioButtonUncheckedIcon color="secondary" />
                ) : (
                  <CheckCircleIcon color="primary" />
                )}
                <Typography 
                  variant="h6" 
                  component="h2" 
                  sx={{ 
                    color: problem.isOptional ? 'secondary.main' : 'primary.main',
                    fontWeight: 600,
                  }}
                >
                  Problem {problem.id}
                </Typography>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    color: 'text.secondary',
                    fontSize: '1.1rem',
                  }}
                >
                  {problem.isOptional ? 'Optional Problem' : 'Required Problem'}
                </Typography>
              </Box>

              <Box sx={{ mt: 'auto', pt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  variant="contained" 
                  color={problem.isOptional ? 'secondary' : 'primary'}
                  onClick={() => handleProblemClick(problem.id)}
                  sx={{
                    px: 3,
                    py: 1,
                    borderRadius: 2,
                    textTransform: 'none',
                  }}
                >
                  Start Problem
                </Button>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default LessonContentJudgeProblems;
