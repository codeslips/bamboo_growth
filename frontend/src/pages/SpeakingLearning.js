import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Button, Box, Card, CardContent, IconButton, Popover, Fab } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import LoopIcon from '@mui/icons-material/Loop';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { fetch_file, post_json, get } from '../api/index';
import WordCard from '../components/language/WordCard';
import { useLocation, useNavigate } from 'react-router-dom';
import LessonPage from '../components/page/LessonPage';
import AudioWave from '../components/media/AudioWave';
import MicrophoneWave from '../components/media/MicrophoneWave';
import { combineAudioBuffers, exportBufferToWavBlob, createMuteAudioBlob } from '../utils/audioUtils';
import { postFormData, put } from '../api/index';
import { uploadFile } from '../api/objects';
import Notify from '../components/common/Notify';
import { useTranslation } from 'react-i18next';

const SpeakingLearning = ({ lesson, mode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [sentences, setSentences] = useState([]);
  const [showSentenceCards, setShowSentenceCards] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [sentenceAudios, setSentenceAudios] = useState({});
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [pageHash, setPageHash] = useState(null);
  const [playingSentenceIndex, setPlayingSentenceIndex] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [cachedAudioBlobs, setCachedAudioBlobs] = useState({});
  const [isCyclicPlayback, setIsCyclicPlayback] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSingleSentenceLoop, setIsSingleSentenceLoop] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const [markdownContent, setMarkdownContent] = useState('');
  const [mediaStream, setMediaStream] = useState(null);
  const [pronunciationAssessments, setPronunciationAssessments] = useState([]);
  const [isRecordingSentence, setIsRecordingSentence] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  const { t } = useTranslation();
  const hasUnrecordedSentences = () => {
    return sentences.some((_, index) => !sentenceAudios[index]);
  };

  const fetchAndCreateAudioBlob = async (text) => {
    try {
      const response = await post_json('/tts', {
        text: text,
        voice: 'en-US-AriaNeural',
        output_format: 'audio-16khz-32kbitrate-mono-mp3',
      });

      if (!response.data || !response.data.audio || typeof response.data.audio !== 'string') {
        setNotification({
          open: true,
          message: 'Invalid audio data received from server',
          severity: 'error'
        });
        return null;
      }

      const decodedAudio = atob(response.data.audio);
      const audioArray = new Uint8Array(decodedAudio.length);
      for (let i = 0; i < decodedAudio.length; i++) {
        audioArray[i] = decodedAudio.charCodeAt(i);
      }

      return new Blob([audioArray], { type: 'audio/mp3' });
    } catch (error) {
      setNotification({
        open: true,
        message: 'Failed to fetch TTS audio',
        severity: 'error'
      });
      return null;
    }
  };


  useEffect(() => {

    console.log(mediaStream)
    setPageHash(lesson.hash);

    initializeMediaRecorder();

    return () => {
      if (mediaRecorder) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      }
    };
  }, [location.search]);

  const initializeMediaRecorder = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setNotification({
        open: true,
        message: "Your browser doesn't support audio recording.",
        severity: 'error'
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);

      recorder.ondataavailable = (e) => {
        setAudioBlob(e.data);
      };
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setNotification({
        open: true,
        message: "Error accessing microphone. Please check your permissions.",
        severity: 'error'
      });
    }
  };

  const startRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'inactive') {
      mediaRecorder.start();
      setIsRecording(true);
    } else if (!mediaRecorder) {
      setMediaError("Media recorder is not initialized. Please refresh the page.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!audioBlob) {
        setNotification({
          open: true,
          message: 'No recording to submit',
          severity: 'error'
        });
        return;
      }

      const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
      const uploadResult = await uploadFile(
        audioFile,
        (progress) => {
          console.log('Upload progress:', progress.percent + '%');
        }
      );

      if (!uploadResult || !uploadResult.url) {
        setNotification({
          open: true,
          message: 'Failed to upload audio file',
          severity: 'error'
        });
        return;
      }

      const summaryScore = calculateSummaryScore(pronunciationAssessments);
      const progressData = {
        score: summaryScore,
        progress: 100.0,
        learning_log: {
          audio_file: uploadResult.url,
          audio_name: 'recording.wav',
          audio_size: audioBlob.size,
          audio_created_at: new Date().toISOString(),
          pronunciation_assessment: pronunciationAssessments,
          completed_at: new Date().toISOString()
        }
      };

      const progressResult = await put(`/user-lessons/${lesson.hash}/progress`, progressData);

      if (!progressResult) {
        setNotification({
          open: true,
          message: 'Failed to update lesson progress',
          severity: 'error'
        });
        return;
      }

      setNotification({
        open: true,
        message: 'Recording submitted successfully!',
        severity: 'success'
      });
      
      navigate('/user-learning-result');

    } catch (error) {
      console.error('Error submitting recording:', error);
      setNotification({
        open: true,
        message: error.message || 'Error submitting recording',
        severity: 'error'
      });
    }
  };

  const handleEditorChange = (value) => {
    setMarkdownContent(value);
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  const handleTTS = useCallback(async () => {
    setIsPlayingTTS(true);
    try {
      if (cachedAudioBlobs[markdownContent]) {
        playAudio(cachedAudioBlobs[markdownContent]);
      } else {
        const audioBlob = await fetchAndCreateAudioBlob(markdownContent);
        setCachedAudioBlobs(prev => ({
          ...prev,
          [markdownContent]: audioBlob
        }));
        playAudio(audioBlob);
      }
    } catch (error) {
      console.error('Error fetching TTS audio:', error);
      setIsPlayingTTS(false);
    }
  }, [markdownContent, cachedAudioBlobs]);

  const playAudio = useCallback((blob) => {
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);

    const audio = new Audio(url);
    audio.onended = () => setIsPlayingTTS(false);
    audio.play();
  }, []);


  const switchRecordSentences = () => {
    if (isRecordingSentence) {
      setIsRecordingSentence(false);
    } else {
      splitIntoSentences();
      setIsRecordingSentence(true);
    }
  };


  const splitIntoSentences = () => {
    const sentenceRegex = /[^.!?]+[.!?]+/g;
    const extractedSentences = markdownContent.match(sentenceRegex) || [];
    
    // Initialize sentenceAudios with null values for each sentence
    setSentenceAudios(prevAudios => {
      const newAudios = extractedSentences.reduce((acc, _, index) => {
        if (!acc[index]) {
          acc[index] = null;
        }
        return acc;
      }, { ...prevAudios });
      
      console.log('New sentence audios state:', newAudios);
      return newAudios;
    });

    setSentences(extractedSentences);
    setShowSentenceCards(true);
  };

  const playSentence = useCallback(async (sentence, index) => {
    try {
      if (playingSentenceIndex === index && audioElement) {
        audioElement.pause();
        setPlayingSentenceIndex(null);
        setIsPlaying(false);
        return;
      }

      setPlayingSentenceIndex(index);
      setIsPlaying(true);
      
      if (audioElement) {
        audioElement.pause();
      }

      let audioBlob;
      if (cachedAudioBlobs[sentence]) {
        audioBlob = cachedAudioBlobs[sentence];
      } else {
        audioBlob = await fetchAndCreateAudioBlob(sentence);
        setCachedAudioBlobs(prev => ({
          ...prev,
          [sentence]: audioBlob
        }));
      }

      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audio.onended = () => {
        if (isSingleSentenceLoop && loopCount > 0) {
          setLoopCount(prevCount => prevCount - 1);
          audio.play();
        } else if (isCyclicPlayback) {
          const nextIndex = (index + 1) % sentences.length;
          playSentence(sentences[nextIndex], nextIndex);
          setCurrentSentenceIndex(nextIndex);
        } else {
          setPlayingSentenceIndex(null);
          setAudioElement(null);
          setIsPlaying(false);
        }
      };
      audio.play();
      setAudioElement(audio);
    } catch (error) {
      console.error('Error playing sentence:', error);
      setPlayingSentenceIndex(null);
      setAudioElement(null);
      setIsPlaying(false);
    }
  }, [playingSentenceIndex, audioElement, cachedAudioBlobs, fetchAndCreateAudioBlob, isCyclicPlayback, sentences, isSingleSentenceLoop, loopCount]);

  const handleSentenceDoubleClick = (event, sentence) => {
    const selection = window.getSelection().toString().trim();
    if (selection && selection.split(' ').length === 1) {
      setSelectedWord({ text: selection });
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
    setSelectedWord(null);
  };

  const startSentenceRecording = (index) => {
    if (mediaRecorder) {
      const chunks = [];
      mediaRecorder.start();
      setCurrentSentenceIndex(index);
      setIsRecordingAudio(true);
      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setSentenceAudios(prev => ({
          ...prev,
          [index]: blob
        }));
        setIsRecordingAudio(false);
        //setCurrentSentenceIndex(null);
      };
    }
  };

  const stopSentenceRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  };

  const handleRecordButtonClick = () => {
    if (isRecordingSentence) {
      if (isRecordingAudio) {
        stopSentenceRecording();
        setIsRecording(false);
      } else {
        const nextIndex = currentSentenceIndex !== null ? currentSentenceIndex : 0;
        startSentenceRecording(nextIndex);
        setIsRecording(true);
      }
    } else {
      if (isRecording) {
        stopRecording();
        setIsRecording(false);
      } else {
        startRecording();
        setIsRecording(true);
      }
    }
  };

  const handleSentenceCardClick = (index) => {
    setCurrentSentenceIndex(index);
  };

  const handleSentenceTextClick = (index) => {
    if (!isPlaying) {
      setCurrentSentenceIndex(index);
    }
  };

  const toggleCyclicPlayback = () => {
    setIsCyclicPlayback(!isCyclicPlayback);
  };

  const stopAllPlayback = () => {
    if (audioElement) {
      audioElement.pause();
    }
    setPlayingSentenceIndex(null);
    setAudioElement(null);
    setIsPlaying(false);
  };

  const toggleSingleSentenceLoop = () => {
    setIsSingleSentenceLoop(!isSingleSentenceLoop);
    setLoopCount(10); // Set default loop count to 3, you can adjust this as needed
  };

  const handleSave = async () => {
    try {
      // First merge the sentence audios
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const recordingsList = [];

      // Add mute blob for initial gap if needed
      if (sentences[0] && sentences[0].start > 0) {
        recordingsList.push(createMuteAudioBlob(sentences[0].start));
      }

      // Add recordings for each sentence
      sentences.forEach((sentence, index) => {
        const recording = sentenceAudios[index];
        if (recording && recording.size > 0) {
          recordingsList.push(recording);
        } else {
          // Create mute blob for missing recordings
          const duration = sentence.end - sentence.start;
          recordingsList.push(createMuteAudioBlob(duration));
        }

        // Add gap between sentences
        if (index < sentences.length - 1) {
          const nextSentence = sentences[index + 1];
          const gapDuration = nextSentence.start - sentence.end;
          if (gapDuration > 0) {
            recordingsList.push(createMuteAudioBlob(gapDuration));
          }
        }
      });

      if (recordingsList.length === 0) {
        setNotification({
          open: true,
          message: 'No recordings to save',
          severity: 'error'
        });
        return;
      }

      // Decode audio buffers
      const buffers = await Promise.all(
        recordingsList.map(async (recording) => {
          try {
            const arrayBuffer = await recording.arrayBuffer();
            return await audioContext.decodeAudioData(arrayBuffer);
          } catch (error) {
            console.error('Failed to decode audio data:', error);
            return null;
          }
        })
      );

      const validBuffers = buffers.filter(Boolean);
      if (validBuffers.length === 0) {
        setNotification({
          open: true,
          message: 'No valid audio buffers after decoding',
          severity: 'error'
        });
        return;
      }

      // Combine buffers and create final blob
      const combinedBuffer = await combineAudioBuffers(validBuffers, audioContext, 16666);
      const mergedBlob = exportBufferToWavBlob(combinedBuffer, 16666);

      // Create a File object from the blob
      const audioFile = new File([mergedBlob], 'merged_audio.wav', { type: 'audio/wav' });

      // Upload using the uploadFile function from objects.js
      const uploadResult = await uploadFile(
        audioFile,
        (progress) => {
          console.log('Upload progress:', progress.percent + '%');
        }
      );

      if (!uploadResult || !uploadResult.url) {
        setNotification({
          open: true,
          message: 'Failed to upload audio file',
          severity: 'error'
        });
        return;
      }

      // Calculate summary score from pronunciation assessments
      const summaryScore = calculateSummaryScore(pronunciationAssessments);

      // Update lesson progress
      const progressData = {
        score: summaryScore,
        progress: 100.0,
        learning_log: {
          audio_file: uploadResult.url,
          audio_name: 'merged_audio.wav',
          audio_size: mergedBlob.size,
          audio_created_at: new Date().toISOString(),
          pronunciation_assessment: pronunciationAssessments,
          completed_at: new Date().toISOString()
        }
      };

      // Update lesson progress
      const progressResult = await put(`/user-lessons/${lesson.hash}/progress`, progressData);

      if (!progressResult) {
        setNotification({
          open: true,
          message: 'Failed to update lesson progress',
          severity: 'error'
        });
        return;
      }

      setNotification({
        open: true,
        message: 'Recording saved successfully!',
        severity: 'success'
      });
      
      navigate('/user-learning-result');

    } catch (error) {
      console.error('Error saving recording:', error);
      setNotification({
        open: true,
        message: error.message || 'Error saving recording',
        severity: 'error'
      });
    }
  };

  const handleAssignment = () => {
    // TODO: Implement assignment logic
  };

  const calculateSummaryScore = (pronunciationData) => {
    if (!pronunciationData || Object.keys(pronunciationData).length === 0) {
      return 0;
    }

    // Filter out null values and get valid assessments
    const validAssessments = Object.values(pronunciationData).filter(assessment => 
      assessment !== null && 
      assessment.accuracy_score !== undefined
    );

    if (validAssessments.length === 0) {
      return 0;
    }

    let totalAccuracy = 0;
    let totalFluency = 0;
    let totalCompleteness = 0;
    let totalPronunciation = 0;

    validAssessments.forEach(assessment => {
      totalAccuracy += assessment.accuracy_score;
      totalFluency += assessment.fluency_score;
      totalCompleteness += assessment.completeness_score;
      totalPronunciation += assessment.pronunciation_score;
    });

    const count = validAssessments.length;

    // Calculate averages
    const averageAccuracy = totalAccuracy / count;
    const averageFluency = totalFluency / count;
    const averageCompleteness = totalCompleteness / count;
    const averagePronunciation = totalPronunciation / count;

    // Final weighted score calculation
    const weightedScore = (
      (averageAccuracy * 0.3) +
      (averageFluency * 0.3) +
      (averageCompleteness * 0.2) +
      (averagePronunciation * 0.2)
    );

    return Math.round(weightedScore);
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  return (
    <Box>
      <LessonPage
        lesson={lesson}
        mode={mode}
        setMarkdownContent={setMarkdownContent}
      />
      
      <Box display="flex" justifyContent="center" my={3}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PlayArrowIcon />}
          onClick={handleTTS}
          disabled={isPlayingTTS}
          sx={{ ml: 2, display: 'none' }}
        >
          {isPlayingTTS ? 'Playing...' : 'Play TTS'}
        </Button>
        <Button
          variant="contained"
          onClick={switchRecordSentences}
          startIcon={!isRecordingSentence ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          sx={{
            ml: 2,
            background: isRecordingSentence 
              ? 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)'
              : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            boxShadow: isRecordingSentence
              ? '0 3px 5px 2px rgba(255, 105, 135, .3)'
              : '0 3px 5px 2px rgba(33, 203, 243, .3)',
            color: 'white',
            padding: '10px 25px',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: isRecordingSentence
                ? '0 6px 10px 4px rgba(255, 105, 135, .3)'
                : '0 6px 10px 4px rgba(33, 203, 243, .3)',
            },
            '&:active': {
              transform: 'translateY(1px)',
            },
            borderRadius: '25px',
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 500
          }}
        >
          {!isRecordingSentence ? 'Record paragraph' : 'Record sentences'}
        </Button>
        
        
      </Box>
      {audioBlob && (
        <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
          <AudioWave audioUrl={URL.createObjectURL(audioBlob)} />
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            sx={{ 
              mt: 2,
              minWidth: '160px',
              borderRadius: '20px',
              textTransform: 'none',
              padding: '8px 24px',
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 5px 8px 2px rgba(0, 0, 0, 0.2)',
              }
            }}
          >
            {t('submit-recording')}
          </Button>
        </Box>
      )}

      {isRecordingSentence && showSentenceCards && (
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            Sentence Cards:
          </Typography>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
            <Button
              variant="contained"
              color={isCyclicPlayback ? "secondary" : "primary"}
              startIcon={<LoopIcon />}
              onClick={toggleCyclicPlayback}
              sx={{
                minWidth: '120px',
                borderRadius: '20px',
                textTransform: 'none',
                padding: '8px 16px',
                background: isCyclicPlayback 
                  ? 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)'
                  : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                boxShadow: isCyclicPlayback
                  ? '0 3px 5px 2px rgba(255, 105, 135, .3)'
                  : '0 3px 5px 2px rgba(33, 203, 243, .3)',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 5px 8px 2px rgba(0, 0, 0, 0.2)',
                }
              }}
            >
              {isCyclicPlayback ? t("cyclic-off") : t("cyclic-on")}
            </Button>
            <Button
              variant="contained"
              color={isSingleSentenceLoop ? "secondary" : "primary"}
              startIcon={<LoopIcon />}
              onClick={toggleSingleSentenceLoop}
              sx={{
                minWidth: '120px',
                borderRadius: '20px',
                textTransform: 'none',
                padding: '8px 16px',
                background: isSingleSentenceLoop 
                  ? 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)'
                  : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                boxShadow: isSingleSentenceLoop
                  ? '0 3px 5px 2px rgba(255, 105, 135, .3)'
                  : '0 3px 5px 2px rgba(33, 203, 243, .3)',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 5px 8px 2px rgba(0, 0, 0, 0.2)',
                }
              }}
            >
              {isSingleSentenceLoop ? `${t('loop')} (${loopCount})` : t("loop")}
            </Button>
            {isPlaying && (
              <Button
                variant="contained"
                color="secondary"
                startIcon={<StopIcon />}
                onClick={stopAllPlayback}
                sx={{
                  minWidth: '100px',
                  borderRadius: '20px',
                  textTransform: 'none',
                  padding: '8px 16px',
                  background: 'linear-gradient(45deg, #FF5252 30%, #FF1744 90%)',
                  boxShadow: '0 3px 5px 2px rgba(255, 23, 68, .3)',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 5px 8px 2px rgba(0, 0, 0, 0.2)',
                  }
                }}
              >
                {t('stop')}
              </Button>
            )}
          </Box>
          {sentences.map((sentence, index) => (
            <Card 
              key={index} 
              sx={{ 
                mb: 2, 
                backgroundColor: currentSentenceIndex === index ? 'rgba(0, 0, 0, 0.08)' : 'inherit',
                cursor: 'pointer',
              }}
            >
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <Box 
                  display="flex" 
                  alignItems="stretch"
                  onDoubleClick={(event) => handleSentenceDoubleClick(event, sentence)}
                >
                  <Box 
                    sx={{ 
                      flexGrow: 1, 
                      width: '96%', 
                      p: 2 
                    }}
                    onClick={() => handleSentenceTextClick(index)}
                  >
                    <Typography variant="body1">
                      {sentence}
                    </Typography>
                    { currentSentenceIndex === index && cachedAudioBlobs[sentence] && (
                      <Box 
                        mt={2}
                        sx={{ 
                          width: '100%',
                          overflow: 'hidden'
                        }}
                      >
                        <Typography variant="caption" color="textSecondary">TTS Audio:</Typography>
                        <AudioWave audioUrl={URL.createObjectURL(cachedAudioBlobs[sentence])} />
                      </Box>
                    )}
                    { !isRecording && currentSentenceIndex === index && sentenceAudios[index] && (
                      <Box 
                        mt={2}
                        sx={{ 
                          width: '100%',
                          overflow: 'hidden'
                        }}
                      >
                        <Typography variant="caption" color="textSecondary">Your Recording:</Typography>
                        <AudioWave audioUrl={URL.createObjectURL(sentenceAudios[index])} />
                      </Box>
                    )}
                  </Box>
                  <Box
                    onClick={(e) => {
                      e.stopPropagation();
                      playSentence(sentence, index);
                      handleSentenceCardClick(index);
                    }}
                    sx={{
                      width: '4%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      background: playingSentenceIndex === index
                        ? 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)'
                        : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                      boxShadow: playingSentenceIndex === index
                        ? '0 3px 5px 2px rgba(255, 105, 135, .3)'
                        : '0 3px 5px 2px rgba(33, 203, 243, .3)',
                      border: '1px solid',
                      borderColor: playingSentenceIndex === index ? 'rgba(255,255,255,0.5)' : 'rgba(33,150,243,0.5)',
                      borderRadius: '4px',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        opacity: 0.9,
                        boxShadow: '0 6px 10px 4px rgba(33, 203, 243, .3)',
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      { isRecordingSentence && <Box display="flex" justifyContent="center" gap={2} mt={3} mb={4}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={hasUnrecordedSentences()}
          sx={{ 
            minWidth: '120px',
            borderRadius: '20px',
            textTransform: 'none',
            padding: '8px 24px',
            background: hasUnrecordedSentences()
              ? 'linear-gradient(45deg, #9e9e9e 30%, #757575 90%)'
              : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            boxShadow: hasUnrecordedSentences()
              ? '0 3px 5px 2px rgba(158, 158, 158, .3)'
              : '0 3px 5px 2px rgba(33, 203, 243, .3)',
            opacity: hasUnrecordedSentences() ? 0.7 : 1,
            '&:hover': {
              cursor: hasUnrecordedSentences() ? 'not-allowed' : 'pointer',
              transform: hasUnrecordedSentences() ? 'none' : 'translateY(-1px)',
              boxShadow: hasUnrecordedSentences()
                ? '0 3px 5px 2px rgba(158, 158, 158, .3)'
                : '0 5px 8px 2px rgba(0, 0, 0, 0.2)',
            }
          }}
        >
          {hasUnrecordedSentences() ? t('record-all-sentences-first') : t('save')}
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleAssignment}
          sx={{
            minWidth: '120px',
            borderRadius: '20px',
            textTransform: 'none',
            padding: '8px 24px',
            background: 'linear-gradient(45deg, #FF8E53 30%, #FE6B8B 90%)',
            boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 5px 8px 2px rgba(0, 0, 0, 0.2)',
            }
          }}
        >
          {t('assignment')}
        </Button>
      </Box>}

      {mediaError && (
        <Typography color="error" sx={{ mt: 2 }}>
          {mediaError}
        </Typography>
      )}

      {/* Floating Action Button for recording */}
      <Fab
        color={isRecordingAudio ? "secondary" : "primary"}
        sx={{
          position: 'fixed',
          bottom: '2px',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        onClick={handleRecordButtonClick}
      >
        {isRecordingAudio ? <StopIcon /> : <MicIcon />}
      </Fab>

      {(isRecording || isRecordingAudio) && mediaStream && (
        <Box
          sx={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translate(-50%, 0)',
            width: '80%',
            maxWidth: '800px',
            zIndex: 1000,
          }}
        >
          <MicrophoneWave isRecording={isRecording || isRecordingAudio} stream={mediaStream} />
        </Box>
      )}

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        {selectedWord && <WordCard word={selectedWord} />}
      </Popover>

      <Notify
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={handleCloseNotification}
      />
    </Box>
  );
};

export default SpeakingLearning;
