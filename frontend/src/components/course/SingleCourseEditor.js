import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { postFormData, putFormData } from '../../api';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const SingleCourseEditor = ({ open, lesson, onSave, onClose, course_id }) => {
  const lessonTypes = ['dubbing', 'video', 'quiz', 'text'];
  const [localLesson, setLocalLesson] = useState(lesson || {});
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Update local state when lesson prop changes
  useEffect(() => {
    setLocalLesson(lesson || {});
  }, [lesson]);

  const handleSave = () => {
    onSave(localLesson);
    onClose();
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes('image/jpeg') && !file.type.includes('image/jpg')) {
      alert('Please select a JPG image file');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    setSelectedFile(file);
  };

  const handleUploadConfirm = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await putFormData(
        `/course-file/${course_id}/lesson/${lesson.id}/background`,
        formData
      );
      alert('Background image updated successfully');
      setSelectedFile(null); // Clear the selected file after successful upload
    } catch (error) {
      console.error('Error uploading background:', error);
      alert('Failed to upload background image');
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Edit Lesson</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="Title"
            value={localLesson?.title || ''}
            onChange={(e) => setLocalLesson({ ...localLesson, title: e.target.value })}
            variant="outlined"
          />
          
          <FormControl fullWidth>
            <InputLabel>Lesson Type</InputLabel>
            <Select
              value={localLesson?.lesson_type || ''}
              label="Lesson Type"
              onChange={(e) => setLocalLesson({ ...localLesson, lesson_type: e.target.value })}
            >
              {lessonTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Content Path"
            value={localLesson?.content || ''}
            onChange={(e) => setLocalLesson({ ...localLesson, content: e.target.value })}
            variant="outlined"
            helperText="Example: lesson/42/content.md"
          />

          <TextField
            fullWidth
            label="Lesson ID"
            value={localLesson?.id || ''}
            disabled
            variant="outlined"
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              component="label"
              variant="contained"
              startIcon={<CloudUpload />}
              disabled={!lesson?.id}
            >
              Select Background Image
              <VisuallyHiddenInput
                type="file"
                accept=".jpg,.jpeg"
                onChange={handleFileSelect}
              />
            </Button>

            {imagePreview && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <img
                  src={imagePreview}
                  alt="Background preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '200px',
                    objectFit: 'contain',
                    borderRadius: '4px'
                  }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleUploadConfirm}
                  disabled={!selectedFile}
                >
                  Confirm Upload
                </Button>
              </Box>
            )}
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={localLesson?.is_show ?? true}
                onChange={(e) => setLocalLesson({ ...localLesson, is_show: e.target.checked })}
                color="primary"
              />
            }
            label="Show Lesson"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          variant="contained" 
          color="primary"
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SingleCourseEditor; 