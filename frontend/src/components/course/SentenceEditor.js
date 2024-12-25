import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Button, 
  Box,
  Paper,
  Typography,
  Divider,
  IconButton
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

const SentenceEditor = ({ open, sentences, fullSentences, onSave, onClose }) => {
  const [editedSentences, setEditedSentences] = useState([]);
  const [editedFullSentences, setEditedFullSentences] = useState({});

  // Update state when props change
  useEffect(() => {
    if (open) {
      setEditedSentences(sentences);
      setEditedFullSentences(fullSentences);
    }
  }, [open, sentences, fullSentences]);

  const handleSentenceChange = (index, field, value) => {
    const newSentences = [...editedSentences];
    newSentences[index] = {
      ...newSentences[index],
      [field]: value
    };
    setEditedSentences(newSentences);
  };

  const handleFullSentenceChange = (field, value) => {
    setEditedFullSentences({
      ...editedFullSentences,
      [field]: value
    });
  };

  const handleSave = () => {
    onSave(editedSentences, editedFullSentences);
    onClose();
  };

  const handleAddSentence = (index) => {
    const newSentence = {
      text: '',
      translate: '',
      phonetic: '',
      start: 0,
      end: 0
    };
    const newSentences = [...editedSentences];
    newSentences.splice(index + 1, 0, newSentence);
    setEditedSentences(newSentences);
  };

  const handleDeleteSentence = (index) => {
    const newSentences = [...editedSentences];
    newSentences.splice(index, 1);
    setEditedSentences(newSentences);
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
          minHeight: '80vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: 'primary.main', 
        color: 'white',
        py: 2
      }}>
        Edit Sentences
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
            Full Sentence Details
          </Typography>
          <TextField
            fullWidth
            label="Full Text"
            value={editedFullSentences.text || ''}
            onChange={(e) => handleFullSentenceChange('text', e.target.value)}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Full Phonetic"
            value={editedFullSentences.phonetic || ''}
            onChange={(e) => handleFullSentenceChange('phonetic', e.target.value)}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 3 }}>
            <TextField
              label="Full Start Time"
              value={editedFullSentences.start || 0}
              onChange={(e) => handleFullSentenceChange('start', parseFloat(e.target.value))}
              type="number"
              inputProps={{ step: 0.01 }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Full End Time"
              value={editedFullSentences.end || 0}
              onChange={(e) => handleFullSentenceChange('end', parseFloat(e.target.value))}
              type="number"
              inputProps={{ step: 0.01 }}
              sx={{ flex: 1 }}
            />
          </Box>
        </Paper>

        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" sx={{ mb: 3, color: 'primary.main' }}>
          Individual Sentences
        </Typography>

        {editedSentences.map((sentence, index) => (
          <Paper 
            key={index} 
            elevation={2} 
            sx={{ 
              p: 3, 
              mb: 3, 
              borderRadius: 2,
              '&:hover': {
                boxShadow: 6
              },
              transition: 'box-shadow 0.2s'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                Sentence {index + 1}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton 
                  onClick={() => handleAddSentence(index)}
                  color="primary"
                  title="Add sentence after this one"
                >
                  <AddCircleOutlineIcon />
                </IconButton>
                <IconButton 
                  onClick={() => handleDeleteSentence(index)}
                  color="error"
                  title="Delete this sentence"
                  disabled={editedSentences.length <= 1}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Box>
            </Box>

            
            <TextField
              fullWidth
              label="Text"
              value={sentence.text}
              onChange={(e) => handleSentenceChange(index, 'text', e.target.value)}
              sx={{ mb: 2 }}
              multiline
            />
            <TextField
              fullWidth
              label="Translation"
              value={sentence.translate}
              onChange={(e) => handleSentenceChange(index, 'translate', e.target.value)}
              sx={{ mb: 2 }}
              multiline
            />
            <TextField
              fullWidth
              label="Phonetic"
              value={sentence.phonetic}
              onChange={(e) => handleSentenceChange(index, 'phonetic', e.target.value)}
              sx={{ mb: 2 }}
              multiline
            />
            <Box sx={{ display: 'flex', gap: 3 }}>
              <TextField
                label="Start Time"
                value={sentence.start}
                onChange={(e) => handleSentenceChange(index, 'start', parseFloat(e.target.value))}
                type="number"
                inputProps={{ step: 0.01 }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="End Time"
                value={sentence.end}
                onChange={(e) => handleSentenceChange(index, 'end', parseFloat(e.target.value))}
                type="number"
                inputProps={{ step: 0.01 }}
                sx={{ flex: 1 }}
              />
            </Box>
          </Paper>
        ))}
      </DialogContent>
      <DialogActions sx={{ p: 3, bgcolor: 'grey.50' }}>
        
        <Button 
          onClick={onClose}
          variant="outlined"
          sx={{ px: 4 }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          sx={{ px: 4 }}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SentenceEditor;
