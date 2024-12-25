import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  Paper,
  CircularProgress,
  Container,
  Dialog,
  Alert,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const GenerateSentences = ({ open, onClose, onGenerateContent }) => {
  const [userInput, setUserInput] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleApiCall = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://10.101.102.80:8000/mi/v1/agent/coze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bot_type: 'miDubbingJsonEncode',
          query: userInput,
          stream: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.code === 0 && data.data && data.data.result) {
        setResult(data.data.result);
      } else {
        throw new Error('Unexpected response structure');
      }
    } catch (error) {
      console.error("There was an error calling the API:", error);
      setError("Error fetching API data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    onGenerateContent(result);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          width: '100%',
          maxWidth: '800px',
          m: 2,
          overflow: 'hidden'
        }
      }}
    >
      <Box sx={{ 
        p: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            mb: 3,
            fontWeight: 600,
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            backgroundClip: 'text',
            textFillColor: 'transparent',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Content Generator
        </Typography>

        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            width: '100%',
            maxWidth: '100%',
            borderRadius: 2,
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            boxSizing: 'border-box'
          }}
        >
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Enter your topic"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            sx={{ 
              mb: 3,
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: '#2196F3',
                },
              },
            }}
          />
          
          <Button
            variant="contained"
            onClick={handleApiCall}
            disabled={!userInput || isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : <AutoFixHighIcon />}
            sx={{ 
              mr: 2,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
              color: 'white',
              padding: '10px 30px',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
              }
            }}
          >
            {isLoading ? 'Generating...' : 'Generate Content'}
          </Button>
        </Paper>

        {result && (
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              width: '100%',
              maxWidth: '100%',
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              boxSizing: 'border-box'
            }}
          >
            <Typography 
              variant="body1" 
              sx={{ 
                mb: 3,
                lineHeight: 1.8,
                color: '#333'
              }}
            >
              {result}
            </Typography>
            
            <Button 
              variant="contained" 
              onClick={handleFinish}
              startIcon={<CheckCircleIcon />}
              sx={{ 
                background: 'linear-gradient(45deg, #4CAF50 30%, #81C784 90%)',
                boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
                color: 'white',
                padding: '10px 30px',
                '&:hover': {
                  background: 'linear-gradient(45deg, #388E3C 30%, #66BB6A 90%)',
                }
              }}
            >
              Use This Content
            </Button>
          </Paper>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>
    </Dialog>
  );
};

export default GenerateSentences;