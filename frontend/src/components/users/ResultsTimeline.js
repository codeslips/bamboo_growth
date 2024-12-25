import React from 'react';
import {
  Box,
  Typography,
  Card,
  IconButton,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
import {
  Share as ShareIcon,
  School as SchoolIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

const ResultsTimeline = ({
  results,
  handleShareToggle,
  setShareDialog,
}) => {
  return (
    <Box sx={{ 
      p: 3, 
      backgroundColor: 'background.paper',
      borderRadius: 2,
      boxShadow: 1
    }}>
      {results.length > 0 ? (
        <Timeline position="alternate">
          {results.map((result, index) => (
            <TimelineItem key={result.hash}>
              <TimelineSeparator>
                <TimelineDot 
                  sx={{ 
                    bgcolor: result.score >= 0.7 ? 'success.main' : 'warning.main',
                    boxShadow: theme => `0 0 0 4px ${alpha(
                      result.score >= 0.7 ? theme.palette.success.main : theme.palette.warning.main,
                      0.2
                    )}`
                  }}
                >
                  {result.score >= 0.7 ? <CheckCircleIcon /> : <SchoolIcon />}
                </TimelineDot>
                {index < results.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              
              <TimelineContent>
                <Card
                  sx={{
                    p: 3,
                    mb: 3,
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme => `0 8px 16px ${alpha(theme.palette.primary.main, 0.15)}`,
                    },
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    {result.lesson?.title || 'Untitled Lesson'}
                  </Typography>
                  
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      color: result.score >= 0.7 ? 'success.main' : 'warning.main',
                      fontWeight: 'medium',
                      mb: 1
                    }}
                  >
                    Score: {(result.score * 100).toFixed(1)}%
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Completed on {new Date(result.created_at).toLocaleDateString()} at{' '}
                    {new Date(result.created_at).toLocaleTimeString()}
                  </Typography>

                  <Box sx={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mt: 2,
                    pt: 2,
                    borderTop: '1px solid',
                    borderColor: 'divider'
                  }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={result.is_shared}
                          onChange={() => handleShareToggle(result)}
                          color="primary"
                          size="small"
                        />
                      }
                      label="Share Result"
                    />
                    {result.is_shared && (
                      <IconButton
                        size="small"
                        onClick={() => setShareDialog({ open: true, result })}
                        color="primary"
                        sx={{
                          '&:hover': {
                            backgroundColor: theme => alpha(theme.palette.primary.main, 0.1),
                          }
                        }}
                      >
                        <ShareIcon />
                      </IconButton>
                    )}
                  </Box>
                </Card>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      ) : (
        <Box sx={{ 
          textAlign: 'center',
          py: 8
        }}>
          <SchoolIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography color="textSecondary">
            No learning results found
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ResultsTimeline;
