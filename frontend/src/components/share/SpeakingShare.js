import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Paper, Avatar } from '@mui/material';
import Markdown from '@uiw/react-markdown-preview';
import ShareButton from '../share/ShareButton';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { styled } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { BASE_DATA_PATH } from '../../api/index';
import '@uiw/react-markdown-preview/markdown.css';
import { lighten } from '@mui/material/styles';
import { deepOrange } from '@mui/material/colors';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import EventIcon from '@mui/icons-material/Event';

const CustomFloatingButton = styled('button')(({ theme, isMobile }) => ({
  width: isMobile ? '48px' : '56px',
  height: isMobile ? '48px' : '56px',
  borderRadius: '50%',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `linear-gradient(145deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  color: '#fff',
  boxShadow: '0 3px 5px -1px rgba(0,0,0,0.2), 0 6px 10px 0 rgba(0,0,0,0.14), 0 1px 18px 0 rgba(0,0,0,0.12)',
  '&:hover': {
    background: `linear-gradient(145deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
  },
  '&:focus': {
    outline: 'none',
  },
}));

const StyledUserInfoCard = styled(Paper)(({ theme }) => ({
  background: `linear-gradient(145deg, ${lighten(theme.palette.primary.main, 0.7)}, ${lighten(theme.palette.secondary.main, 0.7)})`,
  borderRadius: '20px',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.2)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 12px 40px 0 rgba(31, 38, 135, 0.3)',
  },
}));

const SpeakingShare = ({ lessonData }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const audioRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (lessonData) {
      // Set audio URL using the learning_log data
      setAudioUrl(`${lessonData.learning_log.audio_file}`);
    }
  }, [lessonData]);

  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      const handleEnded = () => {
        setIsPlaying(false);
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
        }
      };

      audioRef.current.addEventListener('ended', handleEnded);

      return () => {
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.pause();
        audioRef.current = null;
      };
    }
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!lessonData) {
    return null;
  }

  const { lesson, lesson_page } = lessonData;

  return (
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      {!isPlaying && <Box sx={{ padding: 3 }}>
        <StyledUserInfoCard elevation={3} sx={{ padding: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              sx={{
                bgcolor: deepOrange[500],
                width: 60,
                height: 60,
                fontSize: '1.5rem',
                fontWeight: 'bold',
                mr: 3,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              }}
            >
              {lesson.title.charAt(0).toUpperCase()}
            </Avatar>
            
            <Box>
              <Typography variant="h4" gutterBottom sx={{ 
                fontWeight: 'bold', 
                color: 'primary.main',
                fontSize: '1.8rem'
              }}>
                {lesson.title}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <RecordVoiceOverIcon sx={{ mr: 1, color: 'secondary.main' }} />
                <Typography variant="subtitle1" color="text.secondary">
                  Lesson Type: Speaking
                </Typography>
              </Box>
            </Box>

            <Box sx={{ 
              position: 'absolute', 
              top: 16, 
              right: 16, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              backgroundColor: 'primary.main',
              borderRadius: '50%',
              width: 60,
              height: 60,
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            }}>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                {lessonData['score']}
              </Typography>
              <Typography variant="caption" sx={{ color: 'white' }}>
                总分
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <EventIcon sx={{ mr: 1, color: 'secondary.main' }} />
              <Typography variant="body1" color="text.secondary">
                Completion Date: {new Date(lessonData.created_at).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
        </StyledUserInfoCard>
      </Box>}
      
      <Box sx={{ padding: 3, paddingBottom: 12 }}>
        <Markdown 
          source={lesson_page['page_content']} 
          components={{
            h1: ({ node, ...props }) => (
              <Typography 
                variant="h2" 
                sx={{ 
                  mt: 4, 
                  mb: 2, 
                  fontWeight: 600,
                  color: 'primary.main',
                  fontSize: '2rem !important'
                }} 
                {...props} 
              />
            ),
            h2: ({ node, ...props }) => (
              <Typography 
                variant="h3" 
                sx={{ 
                  mt: 3, 
                  mb: 2, 
                  fontWeight: 600,
                  color: 'primary.main',
                  fontSize: '1.8rem !important'
                }} 
                {...props} 
              />
            ),
            p: ({ node, ...props }) => (
              <Typography 
                variant="body1" 
                sx={{ 
                  my: 2,
                  color: 'text.primary',
                  fontSize: isPlaying ? '1.2rem !important' : '1rem !important',
                  lineHeight: 1.6,
                }} 
                {...props} 
              />
            ),
            li: ({ node, ...props }) => (
              <Typography 
                component="li" 
                sx={{ 
                  my: 1,
                  color: 'text.primary',
                  fontSize: '1.8rem !important',
                  lineHeight: 1.6,
                  '& p': {
                    fontSize: '1.8rem !important',
                  }
                }} 
                {...props} 
              />
            ),
            blockquote: ({ node, ...props }) => (
              <Box
                component="blockquote"
                sx={{
                  borderLeft: 4,
                  borderColor: 'primary.main',
                  pl: 2,
                  my: 2,
                  color: 'text.secondary',
                  fontStyle: 'italic',
                  fontSize: '1.8rem !important',
                  '& p': {
                    fontSize: '1.8rem !important',
                  }
                }}
                {...props}
              />
            ),
          }}
          wrapperElement={{
            "data-color-mode": "light",
            style: {
              fontSize: '1.8rem',
              backgroundColor: 'transparent',
              '--color-canvas-default': 'transparent',
            }
          }}
        />
      </Box>

      <Box sx={{ 
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 3,
        display: 'flex',
        gap: 2,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'background.default',
        borderTop: 1,
        borderColor: 'divider',
        zIndex: 1000,
      }}>
        <CustomFloatingButton
          onClick={handlePlayPause}
          aria-label="play/pause"
          isMobile={isMobile}
        >
          {isPlaying ? 
            <PauseIcon fontSize={isMobile ? "small" : "medium"} /> : 
            <PlayArrowIcon fontSize={isMobile ? "small" : "medium"} />
          }
        </CustomFloatingButton>
        <ShareButton lessonData={lessonData} />
      </Box>
    </Box>
  );
};

export default SpeakingShare;
