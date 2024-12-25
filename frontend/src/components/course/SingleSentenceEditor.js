import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';

const SingleSentenceEditor = ({ open, sentence, onSave, onClose }) => {
  const [editedSentence, setEditedSentence] = useState(sentence);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedSentence(prev => ({
      ...prev,
      [name]: (name === 'start' || name === 'end') ? Number(value) : value
    }));
  };

  const handleSubmit = () => {
    onSave(editedSentence);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Sentence</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Text"
          name="text"
          value={editedSentence?.text || ''}
          onChange={handleChange}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Translation"
          name="translate"
          value={editedSentence?.translate || ''}
          onChange={handleChange}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Phonetic"
          name="phonetic"
          value={editedSentence?.phonetic || ''}
          onChange={handleChange}
          margin="normal"
        />
        <TextField
          type="number"
          label="Start Time (seconds)"
          name="start"
          value={editedSentence?.start || 0}
          onChange={handleChange}
          margin="normal"
          inputProps={{ step: "0.1" }}
          style={{ marginRight: '16px' }}
        />
        <TextField
          type="number"
          label="End Time (seconds)"
          name="end"
          value={editedSentence?.end || 0}
          onChange={handleChange}
          margin="normal"
          inputProps={{ step: "0.1" }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SingleSentenceEditor; 