import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';

const RecordProgress = ({ isRecording, sentences, stopRecording, recordingRate }) => {
  const [recordingProgress, setRecordingProgress] = useState(0);

  useEffect(() => {
    let startTime = Date.now();
    const maxDuration = (((sentences.end) - sentences.start) / recordingRate) * 1000;
    
    const progressInterval = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const progress = Math.min((elapsedTime / maxDuration) * 100, 100);
      setRecordingProgress(progress);

      if (progress >= 100) {
        clearInterval(progressInterval);
        stopRecording();
      }
    }, 100);

    return () => clearInterval(progressInterval);
  }, [isRecording, sentences, stopRecording]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 2 }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={recordingProgress}
          size={60}
          thickness={4}
          sx={{ color: 'primary.main' }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MicIcon color="error" />
        </Box>
      </Box>
      <Box sx={{ ml: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Recording: {Math.round(recordingProgress)}%
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {sentences.start}s - {sentences.end}s
        </Typography>

        {recordingRate}
      </Box>
    </Box>
  );
};

export default RecordProgress;