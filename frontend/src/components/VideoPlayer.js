import React, { useRef, useState, useEffect, useCallback } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { Slider, Typography, Box, Button, Switch, FormControlLabel, CircularProgress } from '@mui/material';

const VideoPlayer = ({ 
  src, 
  width = 800, 
  height = 400, 
  sentences, 
  currentSentence, 
  isRecording, 
  setIsRecording, 
  fullSentences, 
  isMuted,
  playbackSpeed: externalPlaybackSpeed,
  setPlaybackSpeed: externalSetPlaybackSpeed
}) => {
  console.log('VideoPlayer', src);
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(10);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [duration, setDuration] = useState(60);
  const [internalPlaybackSpeed, setInternalPlaybackSpeed] = useState(1);
  const [isSeeking, setIsSeeking] = useState(false);
  
  const playbackSpeed = externalPlaybackSpeed !== undefined ? externalPlaybackSpeed : internalPlaybackSpeed;
  const setPlaybackSpeed = externalSetPlaybackSpeed || setInternalPlaybackSpeed;

  const playVideoFromTo = useCallback((start, end) => {
    if (!playerRef.current || !isVideoReady) return;

    const player = playerRef.current;
    setIsSeeking(true);

    player.pause();

    const seekPromise = new Promise((resolve) => {
      const handleSeeked = () => {
        player.off('seeked', handleSeeked);
        resolve();
      };
      player.on('seeked', handleSeeked);
      player.currentTime(start);
    });

    seekPromise.then(() => {
      setIsSeeking(false);
      player.play().catch(error => {
        console.warn('Playback failed:', error);
      });
    });
  }, [isVideoReady]);

  useEffect(() => {
    if (playerRef.current && isVideoReady) {
      const player = playerRef.current;

      const handleTimeUpdate = () => {
        if (isSeeking) return;

        const currentTime = player.currentTime();
        if (currentTime >= endTime - 0.1) {
          setIsSeeking(true);
          player.pause();
          
          setTimeout(() => {
            player.currentTime(startTime);
            player.play().catch(error => {
              console.warn('Playback failed:', error);
            }).finally(() => {
              setIsSeeking(false);
            });
          }, 50);
        }
      };

      player.on('timeupdate', handleTimeUpdate);
      return () => {
        if (player) {
          player.off('timeupdate', handleTimeUpdate);
        }
      };
    }
  }, [startTime, endTime, isVideoReady, isSeeking]);

  useEffect(() => {
    if (playerRef.current) {
      const player = playerRef.current;

      const handleCanPlay = () => {
        setIsVideoReady(true);
        setDuration(player.duration());
        setIsLoading(false);
      };

      player.on('canplay', handleCanPlay);
      player.on('loadedmetadata', handleCanPlay);

      return () => {
        if (player) {
          player.off('canplay', handleCanPlay);
          player.off('loadedmetadata', handleCanPlay);
        }
      };
    }
  }, []);

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current) {
      const videoElement = videoRef.current;
      if (!videoElement) return;

      playerRef.current = videojs(videoElement, {
        controls: true,
        fluid: true,
        preload: 'auto',
        responsive: true,
        playsinline: true,
        sources: [{
          src: src,
          type: 'video/mp4'
        }],
        controlBar: {
          children: [
            'playToggle',
            'volumePanel',
            'currentTimeDisplay',
            'timeDivider',
            'durationDisplay',
            'progressControl',
            'remainingTimeDisplay',
            'playbackRateMenuButton',
            'fullscreenToggle',
          ],
        },
      }, () => {
        setIsVideoReady(true);
        
        // Set duration when metadata is loaded
        playerRef.current.on('loadedmetadata', () => {
          setIsVideoReady(true);
          setDuration(playerRef.current.duration());
          setIsLoading(false);
        });
      });
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src]);

  // Handle playback speed changes
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.playbackRate(playbackSpeed);
    }
  }, [playbackSpeed]);

  // Handle muting
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.muted(isMuted || isRecording);
    }
  }, [isMuted, isRecording]);

  // Handle current sentence changes
  useEffect(() => {
    let currentS = {}
    if (currentSentence === -1) {
      currentS = {...fullSentences}
    } else {
      currentS = sentences.find(item => item.id === currentSentence);      
    }

    if (currentS && playerRef.current && isVideoReady) {
      setStartTime(currentS.start);
      setEndTime(currentS.end);
      
      const delay = 800;
      setTimeout(() => {
        if (playerRef.current && isVideoReady) {
          playVideoFromTo(currentS.start, currentS.end);
        }
      }, delay);
    }
  }, [currentSentence, sentences, fullSentences, playVideoFromTo, isVideoReady]);

  const handleSliderChange = (event, newValue) => {
    setStartTime(newValue[0]);
    setEndTime(newValue[1]);
  };

  const handleMuteToggle = (event) => {
    if (playerRef.current) {
      playerRef.current.muted(event.target.checked);
    }
  };

  const handleSpeedChange = (event, newValue) => {
    setPlaybackSpeed(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {isLoading && <CircularProgress />}
      <div data-vjs-player>
        <video
          ref={videoRef}
          className="video-js"
          style={{
            maxHeight: '48vh',
            maxWidth: '96vw',
            visibility: isLoading ? 'hidden' : 'visible'
          }}
          playsInline
          preload="auto"
          controls
        />
      </div>
      
      <Box sx={{ width: 300, mt: 2, display: 'none' }}>
        <Typography>Start Time: {startTime.toFixed(2)}s</Typography>
        <Typography>End Time: {endTime.toFixed(2)}s</Typography>
        <Slider
          value={[startTime, endTime]}
          onChange={handleSliderChange}
          min={0}
          max={duration}
          valueLabelDisplay="auto"
          aria-labelledby="time-range-slider"
        />
        <Button 
          onClick={() => playVideoFromTo(startTime)} 
          disabled={!isVideoReady}
          aria-label="Play video segment"
        >
          Play Segment
        </Button>

        <FormControlLabel
          control={
            <Switch
              checked={isMuted}
              onChange={handleMuteToggle}
              name="muteToggle"
              color="primary"
            />
          }
          label="Mute"
        />
        
        <Typography>Playback Speed: {playbackSpeed.toFixed(1)}x</Typography>
        <Slider
          value={playbackSpeed}
          onChange={handleSpeedChange}
          min={0.5}
          max={2}
          step={0.1}
          valueLabelDisplay="auto"
          aria-labelledby="playback-speed-slider"
        />
      </Box>
    </Box>
  );
};

export { VideoPlayer };
