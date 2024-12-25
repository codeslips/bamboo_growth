import React, { useState } from 'react';
import { Box, Typography, Chip, Tooltip, LinearProgress, IconButton } from '@mui/material';
import RecordProgress from './RecordProgress';
import AudioPlayer from './AudioPlayer';
import EditIcon from '@mui/icons-material/Edit';
import SingleSentenceEditor from './course/SingleSentenceEditor';

const SentenceCard = React.memo(({ item, isRecording, currentSentence, recordings, stopRecording, setCurrentSentence, index, totalSentences, pronunciationAssessment, setIsMuted, recordingRate, mode, onSentenceUpdate }) => {
  const isCurrentlyRecording = isRecording && currentSentence === item.id;
  const hasRecording = recordings[item.id] && recordings[item.id].size > 0;
  const isCurrentSentence = currentSentence === item.id;
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleClick = () => {
    if (!isRecording) {
      setCurrentSentence(item.id);
    }
  };

  const calculateOverallScore = (assessment) => {
    if (!assessment) return null;

    const weights = {
      pronunciation: 0.4,
      accuracy: 0.3,
      fluency: 0.2,
      completeness: 0.1
    };

    let totalScore = 0;
    let totalWeight = 0;

    if (assessment.pronunciation_score) {
      totalScore += assessment.pronunciation_score * weights.pronunciation;
      totalWeight += weights.pronunciation;
    }
    if (assessment.accuracy_score) {
      totalScore += assessment.accuracy_score * weights.accuracy;
      totalWeight += weights.accuracy;
    }
    if (assessment.fluency_score) {
      totalScore += assessment.fluency_score * weights.fluency;
      totalWeight += weights.fluency;
    }
    if (assessment.completeness_score) {
      totalScore += assessment.completeness_score * weights.completeness;
      totalWeight += weights.completeness;
    }

    return totalWeight > 0 ? (totalScore / totalWeight).toFixed(2) : null;
  };

  const overallScore = calculateOverallScore(pronunciationAssessment);

  const getScoreColor = (score) => {
    if (score >= 90) return '#4CAF50';
    if (score >= 70) return '#FFC107';
    return '#FF5722';
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    if (mode === 'edit') {
      setEditDialogOpen(true);
    }
  };

  const handleEditSave = async (updatedSentence) => {
    try {
      const sentenceWithId = {
        ...updatedSentence,
        id: item.id
      };

      if (onSentenceUpdate) {
        await onSentenceUpdate(sentenceWithId);
      }
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Error saving sentence edits:", error);
    }
  };

  return (
    <Box
      sx={{
        border: '1px solid #e0e0e0',
        minHeight: '8em',
        margin: '5px 0',
        padding: '8px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        cursor: isRecording ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': {
          backgroundColor: isCurrentSentence ? '#bbdefb' : '#f0f7ff',
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        },
        position: 'relative',
        overflow: 'hidden', // Changed back to 'hidden'
        backgroundColor: isCurrentSentence ? '#e3f2fd' : 'inherit',
        borderColor: isCurrentSentence ? '#2196f3' : '#e0e0e0',
      }}
      onClick={handleClick}
    >
      <Chip
        label={`${index + 1}/${totalSentences}`}
        size="small"
        sx={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          color: '#1976d2',
          fontWeight: 'bold',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      />
      <Tooltip title={item.translate}>
        <Typography 
          variant="body1" 
          gutterBottom 
          sx={{ 
            marginRight: '60px',
            marginBottom: '15px',
            lineHeight: 1.6,
            fontWeight: isCurrentSentence ? 'bold' : 'normal',
            color: isCurrentSentence ? '#1565c0' : 'inherit',
          }}
        >
          {item.text}
          <br />
          <span style={{ fontStyle: 'italic', color: '#757575', fontSize: '0.7em' }}>
            {item.phonetic}
          </span>
        </Typography>
      </Tooltip>
      
      {isCurrentlyRecording ? (
        <RecordProgress isRecording={isRecording} sentences={item} stopRecording={stopRecording} recordingRate={recordingRate} />
      ) : hasRecording && (
        <AudioPlayer src={URL.createObjectURL(recordings[item.id])} sentences={item} setIsMuted={setIsMuted} />
      )}
      
      {false && JSON.stringify(pronunciationAssessment)}
      
      {pronunciationAssessment && (
        <Box
          sx={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '4px',
            borderRadius: '4px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            width: '60px',
            zIndex: 1,
          }}
        >
          <Typography
            variant="h6"
            align="center"
            sx={{
              fontWeight: 'bold',
              color: getScoreColor(parseFloat(overallScore)),
              fontSize: '1rem',
            }}
          >
            {overallScore}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={parseFloat(overallScore)}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: (theme) => theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                background: 'linear-gradient(90deg, #FF6B6B 0%, #FFD93D 50%, #6BCB77 100%)',
              },
            }}
          />
        </Box>
      )}

      {mode === 'edit' && (
        <IconButton
          onClick={handleEditClick}
          sx={{
            position: 'absolute',
            bottom: '8px',
            right: overallScore ? '80px' : '8px',
            zIndex: 2,
            padding: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
            }
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      )}

      <SingleSentenceEditor
        open={editDialogOpen}
        sentence={item}
        onSave={handleEditSave}
        onClose={() => setEditDialogOpen(false)}
      />
    </Box>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item === nextProps.item &&
    prevProps.isRecording === nextProps.isRecording &&
    prevProps.currentSentence === nextProps.currentSentence &&
    prevProps.recordings[prevProps.item.id] === nextProps.recordings[nextProps.item.id] &&
    prevProps.stopRecording === nextProps.stopRecording &&
    prevProps.setCurrentSentence === nextProps.setCurrentSentence &&
    prevProps.index === nextProps.index &&
    prevProps.totalSentences === nextProps.totalSentences &&
    prevProps.pronunciationAssessment === nextProps.pronunciationAssessment &&
    prevProps.mode === nextProps.mode
  );
});

export default SentenceCard;
