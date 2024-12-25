import React from 'react';
import { 
  Dialog, 
  Box, 
  Typography, 
  Button, 
  Alert 
} from '@mui/material';

const PreviewDialog = ({ 
  open, 
  onClose, 
  previewContent, 
  onConfirm, 
  isLoading, 
  error 
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Preview Changes
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Title: {previewContent?.title}
          </Typography>
          <Typography variant="subtitle2" gutterBottom>
            Lesson Type: {previewContent?.lesson_type || 'Not specified'}
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Sentences:
          </Typography>
          <Box sx={{ maxHeight: '200px', overflow: 'auto', bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
            {previewContent?.sentences.map((sentence, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Typography variant="body1">
                  {index + 1}. Text: {sentence.text}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Translation: {sentence.translate || 'None'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Time: {sentence.start}s - {sentence.end}s
                </Typography>
                {sentence.phonetic && (
                  <Typography variant="body2" color="textSecondary">
                    Phonetic: {sentence.phonetic}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Full Sentence:
          </Typography>
          <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
            <Typography variant="body1">
              Text: {previewContent?.fullSentences.text}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Time: {previewContent?.fullSentences.start}s - {previewContent?.fullSentences.end}s
            </Typography>
            {previewContent?.fullSentences.phonetic && (
              <Typography variant="body2" color="textSecondary">
                Phonetic: {previewContent.fullSentences.phonetic}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button 
            onClick={onClose} 
            color="inherit"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            variant="contained" 
            color="primary"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Confirm & Save'}
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>
    </Dialog>
  );
};

export default PreviewDialog; 