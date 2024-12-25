import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Typography, Box, Card, CardContent, IconButton, LinearProgress, Slider, Divider, Chip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import TranslateIcon from '@mui/icons-material/Translate';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';
import { styled } from '@mui/material/styles';
import { lighten } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import { deepOrange } from '@mui/material/colors';
import SpeedIcon from '@mui/icons-material/Speed';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ShareButton from './ShareButton';
import { BASE_DATA_PATH } from '../../api/index';

// Styled Components
const StyledCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(145deg, ${lighten(theme.palette.primary.main, 0.5)}, ${lighten(theme.palette.secondary.main, 0.5)})`,
  borderRadius: '15px',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  backdropFilter: 'blur(4px)',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'scale(1.02)',
    boxShadow: '0 10px 40px 0 rgba(31, 38, 135, 0.47)',
  },
}));

const StyledSlider = styled(Slider)(({ theme }) => ({
  color: theme.palette.primary.light,
  height: 4,
  '& .MuiSlider-thumb': {
    width: 16,
    height: 16,
    transition: '0.3s cubic-bezier(.47,1.64,.41,.8)',
    '&:hover, &.Mui-focusVisible': {
      boxShadow: `0px 0px 0px 8px ${theme.palette.primary.light}33`,
    },
  },
  '& .MuiSlider-rail': {
    opacity: 0.28,
  },
}));

const StyledSentenceCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== 'active',
})(({ theme, active }) => ({
  background: active
    ? `linear-gradient(145deg, ${lighten(theme.palette.primary.main, 0.6)}, ${lighten(theme.palette.secondary.main, 0.6)})`
    : theme.palette.background.paper,
  borderRadius: '20px',
  boxShadow: active ? '0 8px 32px 0 rgba(31, 38, 135, 0.37)' : '0 4px 6px 0 rgba(31, 38, 135, 0.07)',
  backdropFilter: active ? 'blur(4px)' : 'none',
  border: active ? '1px solid rgba(255, 255, 255, 0.18)' : 'none',
  transition: 'all 0.3s ease-in-out',
  transform: active ? 'scale(1.02)' : 'scale(1)',
  '&:hover': {
    boxShadow: '0 10px 20px 0 rgba(31, 38, 135, 0.3)',
  },
}));

const StyledUserInfoCard = styled(Card)(({ theme }) => ({
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

const StyledChip = styled(Chip)(({ theme, color }) => ({
  fontWeight: 'bold',
  backgroundColor: theme.palette[color].light,
  color: theme.palette.getContrastText(theme.palette[color].light),
}));

const StyledSummaryScore = styled(Typography)(({ theme, score }) => ({
  fontWeight: 'bold',
  padding: '4px 8px',
  borderRadius: '12px',
  backgroundColor: theme.palette[getScoreColor(score)].light,
  color: theme.palette.getContrastText(theme.palette[getScoreColor(score)].light),
}));

const ExpandIconWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  backgroundColor: theme.palette.grey[200],
  transition: 'background-color 0.3s',
  '&:hover': {
    backgroundColor: theme.palette.grey[300],
  },
}));

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

// Helper Components
const WordLevelDetails = ({ words }) => {
  return (
    <Box sx={{ mt: 2 }}>
      {words.map((word, index) => (
        <Box key={index} sx={{ mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {word.word} ({word.error_type})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {word.phonemes.map((phoneme, pIndex) => (
              <Chip
                key={pIndex}
                label={`${phoneme.phoneme}: ${phoneme.accuracy_score}%`}
                size="small"
                color={getScoreColor(phoneme.accuracy_score)}
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

// Helper Functions
const getScoreColor = (score) => {
  if (score >= 80) return 'success';
  if (score >= 60) return 'primary';
  return 'error';
};

const calculateTotalScore = (sentences) => {
  if (!sentences || sentences.length === 0) return 0;
  
  const totalScore = sentences.reduce((acc, sentence) => {
    return acc + (
      (sentence.pronunciation_score || 0) +
      (sentence.accuracy_score || 0) +
      (sentence.fluency_score || 0) +
      (sentence.completeness_score || 0)
    );
  }, 0);
  
  return Math.round(totalScore / (sentences.length * 4));
};

const formatTime = (time) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const scoreTypeLabels = {
  pronunciation: '发音',
  accuracy: '准确度',
  fluency: '流利度',
  completeness: '完整性'
};

// Main Component
const DubbingShare = ({ lessonData, hash, loading }) => {
  // Copy all state declarations from CourseShare.js
  const [audioUrl, setAudioUrl] = useState('');
  const [sentences, setSentences] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [title, setTitle] = useState('Course Share');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [anchorEl, setAnchorEl] = useState(null);
  const [expandedSentences, setExpandedSentences] = useState({});

  // Copy all refs from CourseShare.js
  const sentenceRefs = useRef([]);
  const audioRef = useRef(null);
  const updateTimeoutRef = useRef(null);
  const videoRef = useRef(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Add missing event handlers
  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        if (videoRef.current) {
          videoRef.current.pause();
        }
      } else {
        audioRef.current.play();
        if (videoRef.current) {
          videoRef.current.play();
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (event, newValue) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newValue;
      setCurrentTime(newValue);
    }
  };

  const handleVolumeChange = (event, newValue) => {
    if (audioRef.current) {
      audioRef.current.volume = newValue;
      setVolume(newValue);
      setIsMuted(newValue === 0);
    }
  };

  const handleMuteToggle = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVideoMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isVideoMuted;
      setIsVideoMuted(!isVideoMuted);
    }
  };

  const handleSpeedMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleSpeedMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSpeedChange = (speed) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
    handleSpeedMenuClose();
  };

  const toggleSentenceExpansion = (sentenceId) => {
    setExpandedSentences(prev => ({
      ...prev,
      [sentenceId]: !prev[sentenceId]
    }));
  };

  // Add missing useEffect hooks
  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      const handleTimeUpdate = () => {
        setCurrentTime(audioRef.current.currentTime);
        updateCurrentSentence(audioRef.current.currentTime);
      };

      const handleLoadedMetadata = () => setDuration(audioRef.current.duration);

      const handleAudioEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
        }
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
      };

      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      audioRef.current.addEventListener('ended', handleAudioEnded);

      return () => {
        audioRef.current.pause();
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioRef.current.removeEventListener('ended', handleAudioEnded);
        audioRef.current = null;
      };
    }
  }, [audioUrl]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isVideoMuted;
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [videoUrl, isVideoMuted, playbackSpeed]);

  const updateCurrentSentence = useCallback((currentTime) => {
    const index = sentences.findIndex((sentence, i) => {
      const start = sentence.start;
      const end = i < sentences.length - 1 ? sentences[i + 1].start : sentence.end;
      return currentTime/1.2 >= start && currentTime/1.2 < end;
    });

    if (index !== -1 && index !== currentSentenceIndex) {
      setCurrentSentenceIndex(index);
      scrollToSentence(index);
    }
  }, [sentences, currentSentenceIndex]);

  const scrollToSentence = useCallback((index) => {
    if (sentenceRefs.current[index]) {
      sentenceRefs.current[index].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, []);

  useEffect(() => {
    if (lessonData) {
      // Parse the lesson_content from lesson data
      const course_data = JSON.parse(lessonData.lesson.lesson_content);
      const pronunciation_data = lessonData.learning_log.pronunciation_assessment;

      // Set audio URL using the learning_log data
      setAudioUrl(`${lessonData.learning_log.audio_file}`);
      
      // Set video URL using lesson data
      setVideoUrl(`${BASE_DATA_PATH}/course/${lessonData.lesson.file_path}/index.mp4`);
      
      // Set title
      setTitle(course_data?.fullSentences?.text);

      // Update userInfo
      setUserInfo({
        userName: lessonData.user?.full_name || 'Anonymous User',
        lessonTitle: lessonData.lesson?.title || 'Untitled Lesson',
        lessonType: lessonData.lesson?.lesson_type === 'dubbing' ? '配音练习' : lessonData.lesson?.lesson_type,
        createdAt: new Date(lessonData.created_at).toLocaleDateString(),
        status: lessonData.score > 0 ? '已完成' : '进行中',
        progress: 100
      });
      
      // Combine course data with pronunciation data
      const combinedSentences = course_data?.sentences?.map((sentence, index) => ({
        ...sentence,
        ...(pronunciation_data && pronunciation_data[index] ? {
          pronunciation_score: pronunciation_data[index].pronunciation_score || 0,
          accuracy_score: pronunciation_data[index].accuracy_score || 0,
          fluency_score: pronunciation_data[index].fluency_score || 0,
          completeness_score: pronunciation_data[index].completeness_score || 0,
          words: pronunciation_data[index].words || []
        } : {
          pronunciation_score: 0,
          accuracy_score: 0,
          fluency_score: 0,
          completeness_score: 0,
          words: []
        }),
      }));
      
      setSentences(combinedSentences);
      setTotalScore(lessonData.score || calculateTotalScore(combinedSentences));
    }
  }, [lessonData]);

  // Copy the JSX render code from CourseShare.js
  return (
    <>
      <Container sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        paddingBottom: '80px',
      }}>
        {loading ? (
          <LinearProgress />
        ) : (
          <>
            {/* User Info Card */}
            {!isPlaying && userInfo && (
              <StyledUserInfoCard sx={{ mb: 3, overflow: 'visible', position: 'relative' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
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
                    {userInfo.userName.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {userInfo.lessonTitle}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PersonIcon sx={{ mr: 1, color: 'secondary.main' }} />
                      <Typography variant="body2" color="text.secondary">
                        {userInfo.userName}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <RecordVoiceOverIcon sx={{ mr: 1, color: 'secondary.main' }} />
                        <Typography variant="body2" color="text.secondary">
                          {userInfo.lessonType}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <SchoolIcon sx={{ mr: 1, color: 'secondary.main' }} />
                        <Typography variant="body2" color="text.secondary">
                          {userInfo.status} ({userInfo.progress}%)
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Box 
                    sx={{ 
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
                    }}
                  >
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                      {totalScore}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'white' }}>
                      总分
                    </Typography>
                  </Box>
                </CardContent>
              </StyledUserInfoCard>
            )}

            {/* Video Player */}
            {videoUrl && (
              <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  width="100%"
                  height={300}
                  controls={false}
                  muted={isVideoMuted}
                  style={{ borderRadius: '10px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)' }}
                />
                
                {/* Add Audio Controls */}
                <Box sx={{ width: '100%', mt: 2, display: 'none' }}>
                  {/* Title */}
                  <Typography variant="subtitle1" align="center" gutterBottom>
                    {title}
                  </Typography>
                  
                  {/* Progress Slider */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="caption">
                      {formatTime(currentTime)}
                    </Typography>
                    <StyledSlider
                      value={currentTime}
                      max={duration}
                      onChange={handleSeek}
                      aria-label="time-indicator"
                      size="small"
                      sx={{ flexGrow: 1 }}
                    />
                    <Typography variant="caption">
                      {formatTime(duration)}
                    </Typography>
                  </Box>

                  {/* Audio Controls */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {/* Audio Mute Toggle */}
                      <IconButton onClick={handleMuteToggle} size="small">
                        {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                      </IconButton>
                      
                      {/* Volume Slider */}
                      <StyledSlider
                        value={volume}
                        onChange={handleVolumeChange}
                        aria-label="Volume"
                        min={0}
                        max={1}
                        step={0.1}
                        sx={{ width: 100 }}
                        size="small"
                      />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {/* Video Controls */}
                      <IconButton onClick={handleVideoMuteToggle} size="small">
                        {isVideoMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                      </IconButton>
                      <IconButton onClick={handleSpeedMenuOpen} size="small">
                        <SpeedIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>

                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleSpeedMenuClose}
                >
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                    <MenuItem
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      selected={speed === playbackSpeed}
                    >
                      {speed}x
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
            )}

            {/* Sentences Container */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', pb: 2, maxHeight: '40vh' }}>
              { sentences && sentences.map((sentence, index) => (
                <StyledSentenceCard
                  key={sentence.id}
                  active={index === currentSentenceIndex}
                  ref={el => (sentenceRefs.current[index] = el)}
                  sx={{ mb: 2 }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', fontSize: '1.1rem', flexGrow: 1, mr: 2 }}>
                        {sentence.text}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <StyledSummaryScore 
                          variant="body2" 
                          score={parseFloat(calculateTotalScore([sentence]))}
                          sx={{ mr: 2 }}
                        >
                          {calculateTotalScore([sentence])}%
                        </StyledSummaryScore>
                        <ExpandIconWrapper 
                          onClick={() => toggleSentenceExpansion(sentence.id)}
                          sx={{ cursor: 'pointer' }}
                        >
                          {expandedSentences[sentence.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </ExpandIconWrapper>
                      </Box>
                    </Box>

                    {expandedSentences[sentence.id] && (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <TranslateIcon sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            {sentence.translate}
                          </Typography>
                        </Box>
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {Object.entries(scoreTypeLabels).map(([key, label]) => (
                            <Box key={key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                {label}得分:
                              </Typography>
                              <StyledChip
                                label={`${sentence[`${key}_score`].toFixed(1)}%`}
                                color={getScoreColor(sentence[`${key}_score`])}
                                size="small"
                              />
                            </Box>
                          ))}
                        </Box>
                        {sentence.words && sentence.words.length > 0 && (
                          <>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>单词详情:</Typography>
                            <WordLevelDetails words={sentence.words} />
                          </>
                        )}
                      </>
                    )}
                  </CardContent>
                </StyledSentenceCard>
              ))}
            </Box>
          </>
        )}
      </Container>

      {/* Floating Controls */}
      <Box sx={{ 
        position: 'fixed',
        bottom: isMobile ? theme.spacing(4) : theme.spacing(8),
        left: '0',
        right: '0',
        display: 'flex',
        justifyContent: 'center',
        gap: 2,
        zIndex: 2000
      }}>
        <CustomFloatingButton
          onClick={handlePlayPause}
          aria-label="play/pause"
          isMobile={isMobile}
        >
          {isPlaying ? <PauseIcon fontSize={isMobile ? "small" : "medium"} /> : <PlayArrowIcon fontSize={isMobile ? "small" : "medium"} />}
        </CustomFloatingButton>

        <ShareButton 
          hash={hash}
          userInfo={userInfo}
          totalScore={totalScore}
        />
      </Box>
    </>
  );
};

export default DubbingShare;
