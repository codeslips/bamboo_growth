import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Button, Typography, CircularProgress, Snackbar } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ShareIcon from '@mui/icons-material/Share';
import AudioPlayer from './AudioPlayer';
import { postFormData, put } from '../api/index';
import { uploadFile } from '../api/objects';
import { useNavigate } from 'react-router-dom';

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

const RecordShare = ({ open, onClose, audioURL, fullSentences, setIsMuted, course, recordingsPronunciationAssessment }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const navigate = useNavigate(); // Initialize useNavigate
  const [summaryScore, setSummaryScore] = useState(0);
  const [resultHash, setResultHash] = useState(null);

  // Add this useEffect to calculate the summary score when the component mounts
  React.useEffect(() => {
    const score = calculateSummaryScore(recordingsPronunciationAssessment);
    setSummaryScore(score);
  }, [recordingsPronunciationAssessment]);

  const handleUpload = async () => {
    setIsUploading(true);
    try {
      // Fetch the audio file from the URL
      const audioResponse = await fetch(audioURL);
      const audioBlob = await audioResponse.blob();

      // First upload to Tencent COS
      const uploadResult = await uploadFile(
        new File([audioBlob], 'merged_audio.wav', { type: 'audio/wav' }),
        (progress) => {
          console.log('Upload progress:', progress.percent + '%');
        }
      );

      if (!uploadResult || !uploadResult.url) {
        throw new Error('Failed to upload to COS');
      }

      // After successful upload, update the lesson progress
      const progressData = {
        score: summaryScore,
        progress: 100.0,
        learning_log: {
          audio_file: uploadResult.url,
          audio_name: 'recorded_audio.wav',
          audio_size: audioBlob.size,
          audio_created_at: new Date().toISOString(),
          pronunciation_assessment: recordingsPronunciationAssessment,
          completed_at: new Date().toISOString()
        }
      };

      const progressResult = await put(`/user-lessons/${course.lesson}/progress`, progressData);

      if (!progressResult) {
        throw new Error('Failed to update lesson progress');
      }

      setSnackbarMessage('Upload successful and lesson progress updated!');
      setShowSnackbar(true);
      setUploadSuccess(true);
      setResultHash(progressResult.data.learning_log.result_hash);

    } catch (error) {
      console.error('Error during upload or progress update:', error);
      setSnackbarMessage(error.message || 'Upload failed. Please try again.');
      setShowSnackbar(true);
      setUploadSuccess(false);
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenSharePage = async () => {
    if (uploadSuccess) {
      try {
        // Fetch the share token from the backend
        const response = await put(`/user-lessons/results/${resultHash}/share?is_shared=true`);
        const { share_token } = response.data;

        if (!share_token) {
          throw new Error('Failed to retrieve share token');
        }

        // Use the share_token in the URL
        const shareUrl = `/#/share/${share_token}`;
        window.open(shareUrl, '_blank'); // Open in a new tab/window
        onClose(); // Close the dialog
      } catch (error) {
        console.error('Error fetching share token:', error);
        setSnackbarMessage('Unable to open share page. Please try again.');
        setShowSnackbar(true);
      }
    } else {
      setSnackbarMessage('Please upload the file before sharing.');
      setShowSnackbar(true);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          bgcolor: 'primary.main', 
          color: 'white', 
          fontWeight: 'bold',
          p: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}
      >
        <CloudUploadIcon sx={{ fontSize: 28 }} />
        <Typography variant="h5" component="span">
          Your Recorded Audio
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 4 }}>
        <Typography 
          variant="body1" 
          sx={{ 
            mb: 3,
            color: 'text.secondary',
            fontSize: '1.1rem'
          }}
        >
          Listen to your merged audio and upload it to the server when you're ready.
        </Typography>

        {audioURL && (
          <Box 
            sx={{ 
              mb: 4,
              bgcolor: 'grey.50',
              p: 3,
              borderRadius: 3,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              border: '1px solid',
              borderColor: 'grey.200'
            }}
          >
            <AudioPlayer src={audioURL} sentences={fullSentences} setIsMuted={setIsMuted} />
          </Box>
        )}

        <Box 
          sx={{ 
            mb: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 3,
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.200'
          }}
        >
          <Typography variant="h6" sx={{ color: 'text.secondary' }}>
            Overall Score:
          </Typography>
          <Typography 
            variant="h5" 
            sx={{ 
              color: summaryScore >= 80 ? 'success.main' : 
                     summaryScore >= 60 ? 'warning.main' : 'error.main',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            {summaryScore}
            <Typography 
              component="span" 
              sx={{ 
                fontSize: '1rem',
                color: 'text.secondary',
                fontWeight: 'normal'
              }}
            >
              /100
            </Typography>
          </Typography>
        </Box>

        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 3,
            mt: 2
          }}
        >
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={isUploading || uploadSuccess}
            startIcon={isUploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
            sx={{ 
              minWidth: 200,
              height: 52,
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '1.1rem',
              borderRadius: 2,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
              }
            }}
          >
            {isUploading ? 'Uploading...' : 'Upload to Server'}
          </Button>

          {uploadSuccess && (
            <Button
              variant="contained"
              onClick={handleOpenSharePage}
              startIcon={<ShareIcon />}
              sx={{ 
                minWidth: 200,
                height: 52,
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '1.1rem',
                bgcolor: 'success.main',
                borderRadius: 2,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  bgcolor: 'success.dark',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
                }
              }}
            >
              Open Share Page
            </Button>
          )}
        </Box>
      </DialogContent>

      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={() => setShowSnackbar(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbarContent-root': {
            bgcolor: uploadSuccess ? 'success.dark' : 'error.dark',
            borderRadius: 2,
            fontWeight: 500
          }
        }}
      />
    </Dialog>
  );
};

export default RecordShare;