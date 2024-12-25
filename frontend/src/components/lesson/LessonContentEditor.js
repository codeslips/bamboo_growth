import React, { useState, useEffect } from 'react';
import { Box, Paper, Button, Typography, Alert, Snackbar } from '@mui/material';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import SaveIcon from '@mui/icons-material/Save';

const LessonContentEditor = ({ lessonType, lessonContent, onSave }) => {
  const [content, setContent] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    try {
      // Try to parse the lessonContent if it's a string
      if (typeof lessonContent === 'string') {
        const parsedContent = JSON.parse(lessonContent);
        setContent(JSON.stringify(parsedContent, null, 2));
      } else {
        // If it's already an object, stringify it
        setContent(JSON.stringify(lessonContent, null, 2));
      }
    } catch (err) {
      console.error('Error parsing lesson content:', err);
      setError('Invalid JSON content');
      // Set raw content if parsing fails
      setContent(lessonContent || '');
    }
  }, [lessonContent]);

  const handleEditorChange = (value) => {
    setContent(value);
    setError(null); // Clear any previous errors
  };

  const validateJSON = (str) => {
    try {
      JSON.parse(str);
      return true;
    } catch (err) {
      return false;
    }
  };

  const handleSave = async () => {
    try {
      // Validate JSON before saving
      if (!validateJSON(content)) {
        setError('Invalid JSON format');
        return;
      }

      // Parse the content to ensure it's valid JSON before sending
      const parsedContent = JSON.parse(content);

      try {
        await onSave(parsedContent);
        setSuccessMessage('Lesson content saved successfully');
        setError(null);
      } catch (apiError) {
        console.error('API Error:', apiError);
        setError(apiError.message || 'Failed to save lesson content');
      }
    } catch (err) {
      console.error('Error saving lesson content:', err);
      setError('Failed to save lesson content');
    }
  };

  const handleCloseSnackbar = () => {
    setSuccessMessage('');
  };

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 2,
      p: 2,
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Lesson Content Editor ({lessonType})
        </Typography>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!!error}
        >
          Save Changes
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper 
        elevation={3} 
        sx={{ 
          flexGrow: 1,
          width: '98%',
          overflow: 'auto',
          '& .cm-editor': {
            height: '100%',
            minHeight: 'calc(100vh - 200px)'
          }
        }}
      >
        <CodeMirror
          value={content}
          height="100%"
          extensions={[json()]}
          onChange={handleEditorChange}
          theme="light"
          options={{
            lineNumbers: true,
            lineWrapping: true,
            foldGutter: true,
            gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
            autoCloseBrackets: true,
            matchBrackets: true,
            tabSize: 2,
          }}
        />
      </Paper>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success">
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LessonContentEditor;
