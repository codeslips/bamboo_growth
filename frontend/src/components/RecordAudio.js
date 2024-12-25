import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button, Container, Typography, Box, CircularProgress, LinearProgress, Slider, IconButton, Fab, Dialog, DialogTitle, DialogContent, Tooltip, Zoom, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import RecordControl from './RecordControl';
import MicIcon from '@mui/icons-material/Mic';
import RecordProgress from './RecordProgress';
import AudioPlayer from './AudioPlayer';
import MergeIcon from '@mui/icons-material/Merge';
import ShareIcon from '@mui/icons-material/Share'; // Change this import
import SentenceCard from './SentenceCard'; // Add this import
import RecordShare from './RecordShare'; // Add this import
import { combineAudioBuffers, exportBufferToWavBlob, compressAudioBlob, createMuteAudioBlob } from '../utils/audioUtils'; // Add createMuteAudioBlob
import { assessPronunciation, put, patch } from '../api/index.js'; // Add this import
import { useParams } from 'react-router-dom'; // Add this import
import { useLocation } from 'react-router-dom'; // Add this import

const RecordAudio = ({ sentences, currentSentence, setCurrentSentence, isRecording, setIsRecording, fullSentences, setIsMuted, mode, setSentences, setFullSentences }) => {
  const [recordings, setRecordings] = useState({});
  const [recordingsPronunciationAssessment, setRecordingsPronunciationAssessment] = useState({});
  const [audioURL, setAudioURL] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [isMerging, setIsMerging] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [isMerged, setIsMerged] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [course, setCourse] = useState({ id: '', lesson: '' });
  const location = useLocation();
  // Add this near the top with other state declarations
  const [recordingRate, setRecordingRate] = useState(0.9);

  useEffect(() => {
    // Parse the URL to get course_id and lesson_id
    const searchParams = new URLSearchParams(location.search);
    const courseId = searchParams.get('course_hash') || '000000';
    const lessonId = searchParams.get('lesson_hash') || '0';

    setCourse({
      id: courseId,
      lesson: lessonId
    });

    console.log('Parsed course:', { id: courseId, lesson: lessonId });
  }, [location.search]);

  const initializeRecordings = useCallback(() => {
    return sentences.reduce((acc, sentence) => {
      if (!acc[sentence.id]) {
        acc[sentence.id] = null;
      }
      return acc;
    }, {});
  }, [sentences]);

  const initializePronunciationAssessments = useCallback(() => {
    return sentences.reduce((acc, sentence) => {
      if (!acc[sentence.id]) {
        acc[sentence.id] = null;
      }
      return acc;
    }, {});
  }, [sentences]);

  useEffect(() => {

    setRecordings(prevRecordings => {
      const newRecordings = {
        ...initializeRecordings(),
        ...prevRecordings
      };
      return newRecordings;
    });

    setRecordingsPronunciationAssessment(prevAssessments => {
      const newAssessments = {
        ...initializePronunciationAssessments(),
        ...prevAssessments
      };
      return newAssessments;
    });
  }, [initializeRecordings, initializePronunciationAssessments, sentences]);

  const isValidAudioBlob = (blob) => {
    return blob && blob.size > 0 && blob.type.startsWith('audio/');
  };

  const assessRecordingPronunciation = async (id, audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, `recording_${id}.wav`);

      const currentSentence = sentences.find(sentence => sentence.id === id);
      const referenceText = currentSentence ? currentSentence.text : '';

      const assessment = await assessPronunciation(formData, referenceText);
      console.log('20240924', currentSentence, sentences, assessment);

      setRecordingsPronunciationAssessment(prevAssessments => {
        const newAssessments = {
          ...prevAssessments,
          [id]: assessment.data,
        };
        console.log('Updated pronunciation assessments:', newAssessments);
        return newAssessments;
      });

      console.log('Pronunciation assessment:', assessment);
    } catch (error) {
      console.error('Error assessing pronunciation:', error);
    }
  };

  const updateRecording = useCallback(async (id, audioBlob) => {
    // Find the current sentence to get its duration
    const currentSentence = sentences.find(sentence => sentence.id === id);
    const targetDuration = (currentSentence.end - currentSentence.start); // Convert to milliseconds
    
    console.log('20251026001Updating recording', id, audioBlob, recordingRate, targetDuration);
    const compressedAudioBlob = await compressAudioBlob(audioBlob, targetDuration);
    console.log('20251026001Compressed audio blob', compressedAudioBlob);


    setRecordings(prevRecordings => {
      const newRecordings = {
        ...prevRecordings,
        [id]: compressedAudioBlob 
      };
      console.log('New recordings after update:', newRecordings);
      return newRecordings;
    });

    // Assess pronunciation after updating the recording
    assessRecordingPronunciation(id, audioBlob); 
  }, [sentences, recordingRate]);

  const startRecording = useCallback(async (id) => {
    try {
      console.log('Starting recording for sentence', id);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        console.log('Recording stopped, updating with new blob', audioBlob);
        updateRecording(id, audioBlob);
        audioChunksRef.current = [];  // Reset after each recording
      };

      mediaRecorder.start();
      setIsRecording(true);

    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, [updateRecording, setIsRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const mergeRecordings = useCallback(async () => {
    setIsMerging(true);
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Create a list of recordings, including mute blobs for gaps
      const recordingsList = [];

      // Add mute blob for initial gap if needed
      if (sentences[0].start > 0) {
        recordingsList.push(createMuteAudioBlob(sentences[0].start));
      }

      sentences.forEach((sentence, index) => {
        // Add recording or mute blob for the sentence
        const recording = recordings[sentence.id];
        if (isValidAudioBlob(recording)) {
          recordingsList.push(recording);
        } else {
          const duration = sentence.end - sentence.start;
          recordingsList.push(createMuteAudioBlob(duration));
        }

        // Add mute blob for gap between sentences
        if (index < sentences.length - 1) {
          const nextSentence = sentences[index + 1];
          const gapDuration = nextSentence.start - sentence.end;
          if (gapDuration > 0) {
            recordingsList.push(createMuteAudioBlob(gapDuration));
          }
        }
      });

      // Add mute blob for final gap if needed
      const lastSentence = sentences[sentences.length - 1];
      if (lastSentence.end < fullSentences.end) {
        const finalGapDuration = fullSentences.end - lastSentence.end;
        recordingsList.push(createMuteAudioBlob(finalGapDuration));
      }

      if (recordingsList.length === 0) {
        throw new Error('No valid recordings to merge');
      }

      const buffers = await Promise.all(
        recordingsList.map(async (recording) => {
          try {
            const arrayBuffer = await recording.arrayBuffer();
            return await audioContext.decodeAudioData(arrayBuffer);
          } catch (error) {
            console.warn('Failed to decode audio data:', error);
            return null;
          }
        })
      );

      const validBuffers = buffers.filter(Boolean);

      if (validBuffers.length === 0) {
        throw new Error('No valid audio buffers after decoding');
      }

      const combinedBuffer = await combineAudioBuffers(validBuffers, audioContext, 16666);

      const mergedBlob = exportBufferToWavBlob(combinedBuffer, 16666);
      const mergedAudioUrl = URL.createObjectURL(mergedBlob);
      setAudioURL(mergedAudioUrl);
      setIsMerged(true);
    } catch (error) {
      console.error('Error merging recordings:', error);
    }
    setIsMerging(false);
  }, [sentences, recordings, fullSentences]);

  const handleFabClick = () => {
    if (isMerged) {
      handleToggleDialog();
    } else {
      console.log('Current recordings before merge:', recordings);
      mergeRecordings();
    }
  };

  const handleSentenceUpdate = async (updatedSentence) => {
    try {
      // Update the sentences array with the new sentence
      const updatedSentences = sentences.map(sentence => 
        sentence.id === updatedSentence.id ? updatedSentence : sentence
      );

      // Update the fullSentences object if needed
      const newFullSentences = {
        ...fullSentences,
        text: updatedSentences.map(s => s.text).join(' '),
        phonetic: updatedSentences.map(s => s.phonetic).join(' ')
      };

      // Save changes to the backend
      const result = await patch(`/lessons/${course.lesson}/content`, {
        sentences: updatedSentences,
        fullSentences: newFullSentences
      });

      // Update local state if the save was successful
      setSentences(updatedSentences);
      setFullSentences(newFullSentences);
    } catch (error) {
      console.error("Error updating sentence:", error);
      throw error; // Propagate error to the SentenceCard component
    }
  };

  const sentenceItems = useMemo(() => sentences.map((item, index) => (
    <SentenceCard
      key={`${item.id}-${recordingsPronunciationAssessment[item.id] ? 'assessed' : 'not-assessed'}`}
      item={item}
      isRecording={isRecording}
      currentSentence={currentSentence}
      recordings={recordings}
      stopRecording={stopRecording}
      setCurrentSentence={setCurrentSentence}
      index={index}
      setIsMuted={setIsMuted}
      totalSentences={sentences.length}
      mode={mode}
      recordingRate={recordingRate}
      pronunciationAssessment={recordingsPronunciationAssessment[item.id]}
      onSentenceUpdate={handleSentenceUpdate}
    />
  )), [sentences, isRecording, currentSentence, recordings, stopRecording, setCurrentSentence, recordingsPronunciationAssessment, mode, handleSentenceUpdate]);

  const handleStartRecording = useCallback(() => {
    if (currentSentence !== -1) {
      startRecording(currentSentence);
    }
  }, [currentSentence, startRecording]);

  const allSentencesRecorded = useMemo(() => {
    return sentences.every(sentence => recordings[sentence.id] && recordings[sentence.id].size > 0);
  }, [sentences, recordings]);

  useEffect(() => {
    if (audioURL) {
      setOpenDialog(true);
    }
  }, [audioURL]);

  useEffect(() => {
    if (allSentencesRecorded) {
      setShowTooltip(true);
      const timer = setTimeout(() => {
        setShowTooltip(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [allSentencesRecorded]);

  const handleToggleDialog = () => {
    setOpenDialog(prevOpen => !prevOpen);
  };


  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      pt: 2, // Add padding top to create space below the video
      overflow: 'auto' // Allow scrolling if content exceeds the box height
    }}>
      <Typography variant="h4" gutterBottom>
        {/* Your title here if needed */}
      </Typography>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {sentenceItems}
      </Box>

      <Box sx={{ 
        position: 'sticky', 
        bottom: 0, 
        bgcolor: 'background.paper', 
        pt: 2, 
        pb: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2
      }}>
        <RecordControl
          onStartRecording={handleStartRecording}
          disabled={isRecording || currentSentence === -1}
          recordingRate={recordingRate}
          setRecordingRate={setRecordingRate}
        />
      </Box>
      
      {allSentencesRecorded && (
        <Zoom in={allSentencesRecorded} timeout={500}>
          <Tooltip 
            title={isMerged ? "Click here to share this record" : "Click to merge recordings"} 
            arrow
            open={showTooltip}
            disableFocusListener
            disableHoverListener
            disableTouchListener
          >
            <Fab
              color={isMerged ? "primary" : "secondary"}
              aria-label={isMerged ? "share merged audio" : "merge"}
              onClick={handleFabClick}
              disabled={isMerging}
              sx={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                bgcolor: isMerged ? '#4caf50' : '#ff9800',
                '&:hover': {
                  bgcolor: isMerged ? '#45a049' : '#f57c00',
                },
              }}
            >
              {isMerging ? (
                <CircularProgress size={24} color="inherit" />
              ) : isMerged ? (
                <ShareIcon />
              ) : (
                <MergeIcon />
              )}
            </Fab>
          </Tooltip>
        </Zoom>
      )}
      
      <RecordShare 
        open={openDialog}
        onClose={handleToggleDialog}
        audioURL={audioURL}
        fullSentences={fullSentences}
        setIsMuted={setIsMuted}
        course={course}
        recordingsPronunciationAssessment={recordingsPronunciationAssessment}
      />

      {/* Example usage of pronunciation assessment */}
      {false && Object.keys(recordingsPronunciationAssessment).map(id => (
        <Typography key={id} variant="body2">
          Assessment for Sentence {id}: {recordingsPronunciationAssessment[id].score}
        </Typography>
      ))}
    </Box>
  );
};

export { RecordAudio };
