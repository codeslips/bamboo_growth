import React, { useState, useRef, useEffect } from 'react';
import { Button, Typography, Box, IconButton, LinearProgress } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

const AudioPlayer = ({src, sentences, setIsMuted}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    setIsAudioReady(false);
    setDuration(0);
    setCurrentTime(0);
    
    if (src) {
      audioRef.current.load();
    }
  }, [src]);

  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  const playAudio = () => {
    audioRef.current.play();
    setIsPlaying(true);
    setIsMuted(true);  // Set video to muted when audio starts playing
  };
  
  const pauseAudio = () => {
    audioRef.current.pause();
    setIsPlaying(false);
    setIsMuted(false);  // Unmute video when audio is paused
  };
  
  const stopAudio = () => {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    setIsMuted(false);  // Unmute video when audio is stopped
  };
  
  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };
  
  const handleLoadedMetadata = () => {
    const audioDuration = audioRef.current.duration;
    if (isFinite(audioDuration) && audioDuration > 0) {
      setDuration(audioDuration);
      setIsAudioReady(true);
    }
  };

  const handleCanPlay = () => {
    setIsAudioReady(true);
  };

  const handleDurationChange = () => {
    const audioDuration = audioRef.current.duration;
    if (isFinite(audioDuration) && audioDuration > 0) {
      setDuration(audioDuration);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = 'audio.wav'; // You can customize the filename here
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEnded = () => {
    stopAudio();
  };

  return (
    <Box sx={{ mt: 2 }}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onDurationChange={handleDurationChange}
        onEnded={handleEnded}
        style={{ display: 'none' }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <IconButton onClick={isPlaying ? pauseAudio : playAudio} disabled={!isAudioReady}>
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        {sentences.id === -1 && <Button onClick={handleDownload} variant="contained" sx={{ ml: 2 }}>
          Download Audio
        </Button>}
      </Box>
      {sentences.id !== -1 && isAudioReady && isPlaying && (
        <Box sx={{ width: '100%', mt: 2 }}>
          {false && <LinearProgress 
            variant="determinate" 
            value={(currentTime / duration) * 100} 
          />}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Typography>
        </Box>
      )}
      {!isAudioReady && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Loading audio...
        </Typography>
      )}
    </Box>
  ) 
}

export default AudioPlayer;