import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography
} from '@mui/material';

const CourseEditor = ({ open, course, onSave, onClose }) => {
  const [editedCourse, setEditedCourse] = useState(course);

  const handleChange = (field) => (event) => {
    setEditedCourse({
      ...editedCourse,
      [field]: event.target.value
    });
  };

  const handleSubmit = () => {
    onSave(editedCourse);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Course</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            label="Title"
            fullWidth
            value={editedCourse?.title || ''}
            onChange={handleChange('title')}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={editedCourse?.description || ''}
            onChange={handleChange('description')}
          />
          <TextField
            label="Language"
            fullWidth
            value={editedCourse?.language || ''}
            onChange={handleChange('language')}
          />
          <FormControl fullWidth>
            <InputLabel>Level</InputLabel>
            <Select
              value={editedCourse?.level || ''}
              label="Level"
              onChange={handleChange('level')}
            >
              <MenuItem value="beginner">Beginner</MenuItem>
              <MenuItem value="intermediate">Intermediate</MenuItem>
              <MenuItem value="advanced">Advanced</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Duration"
            fullWidth
            value={editedCourse?.duration || ''}
            onChange={handleChange('duration')}
          />
          
          {/* Lessons Section */}
          <Typography variant="h6" sx={{ mt: 2 }}>
            Lessons ({editedCourse?.lessons?.length || 0})
          </Typography>
          <Box sx={{ ml: 2 }}>
            {editedCourse?.lessons?.map((lesson, index) => (
              <Box 
                key={lesson.id} 
                sx={{ 
                  mb: 2, 
                  p: 2, 
                  border: '1px solid #e0e0e0', 
                  borderRadius: 1 
                }}
              >
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Lesson {index + 1}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <TextField
                    label="Title"
                    fullWidth
                    value={lesson.title}
                    onChange={(e) => {
                      const newLessons = [...editedCourse.lessons];
                      newLessons[index] = { ...lesson, title: e.target.value };
                      setEditedCourse({ ...editedCourse, lessons: newLessons });
                    }}
                  />
                  <FormControl fullWidth>
                    <InputLabel>Lesson Type</InputLabel>
                    <Select
                      value={lesson.lesson_type}
                      label="Lesson Type"
                      onChange={(e) => {
                        const newLessons = [...editedCourse.lessons];
                        newLessons[index] = { ...lesson, lesson_type: e.target.value };
                        setEditedCourse({ ...editedCourse, lessons: newLessons });
                      }}
                    >
                      <MenuItem value="dubbing">dubbing</MenuItem>
                      <MenuItem value="coding">coding</MenuItem>
                      <MenuItem value="speaking">speaking</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Content Path"
                    fullWidth
                    value={lesson.content}
                    onChange={(e) => {
                      const newLessons = [...editedCourse.lessons];
                      newLessons[index] = { ...lesson, content: e.target.value };
                      setEditedCourse({ ...editedCourse, lessons: newLessons });
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Box>

          {/* Resources Section */}
          <Typography variant="h6" sx={{ mt: 2 }}>
            Resources ({editedCourse?.resources?.length || 0})
          </Typography>
          <Box sx={{ ml: 2 }}>
            {editedCourse?.resources?.map((resource, index) => (
              <TextField
                key={index}
                label={`Resource ${index + 1} Path`}
                fullWidth
                value={resource.path}
                onChange={(e) => {
                  const newResources = [...editedCourse.resources];
                  newResources[index] = { ...resource, path: e.target.value };
                  setEditedCourse({ ...editedCourse, resources: newResources });
                }}
                sx={{ mb: 1 }}
              />
            ))}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CourseEditor;
