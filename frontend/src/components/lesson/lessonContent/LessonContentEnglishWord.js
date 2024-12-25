import React from 'react';
import { Box, Typography, Paper, Grid, Button } from '@mui/material';

const LessonContentEnglishWord = ({ content }) => {
  console.log('content', content);
  const wordList = typeof content === 'string' ? JSON.parse(content) : content;

  const generateWordUrl = () => {
    const words = wordList.map(word => word.name).join(',');
    const trans = wordList.map(word => word.trans).join(',');
    const usphone = wordList.map(word => word.usphone).join(',');
    
    const url = `http://localhost:5173/?words=${encodeURIComponent(words)}&trans=${encodeURIComponent(trans)}&usphone=${encodeURIComponent(usphone)}`;
    window.open(url, '_blank');
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Grid container spacing={3}>
        {wordList.map((wordData, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
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
                  bgcolor: 'primary.main',
                }
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography 
                  variant="h5" 
                  component="h2" 
                  sx={{ 
                    color: 'primary.main',
                    fontWeight: 600,
                    mb: 1
                  }}
                >
                  {wordData.name}
                </Typography>
                
                <Box sx={{ 
                  bgcolor: 'grey.50', 
                  p: 1.5, 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'grey.200'
                }}>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontFamily: 'monospace',
                      color: 'text.secondary'
                    }}
                  >
                    {wordData.usphone}
                  </Typography>
                </Box>
                
                <Box sx={{ mt: 'auto' }}>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      color: 'text.secondary',
                      fontSize: '1.1rem',
                      fontWeight: 500
                    }}
                  >
                    {wordData.trans}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
        <Button 
          variant="contained" 
          onClick={generateWordUrl}
          sx={{
            px: 4,
            py: 1.5,
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '1.1rem'
          }}
        >
          Open Word List in New Tab
        </Button>
      </Box>
    </Box>
  );
};

export default LessonContentEnglishWord;
