import React, { useState, useEffect } from 'react';
import { Box, Button, IconButton, Dialog, Typography, Alert, LinearProgress } from '@mui/material';
import { RecordAudio } from '../components/RecordAudio.js';
import { VideoPlayer } from '../components/VideoPlayer.js';
import SentenceEditor from '../components/course/SentenceEditor.js';
import { useLocation } from 'react-router-dom';
import { get, put, patch, BASE_URL, BASE_DATA_PATH } from '../api/index.js';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import TranslateIcon from '@mui/icons-material/Translate';
import GenerateSentences from '../components/course/GenerateSentences.js';
import PreviewDialog from '../components/course/PreviewDialog.js';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { uploadFile, validateFileType } from '../api/objects';

const CourseRecord = ({ lesson, mode, isPreview }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const course_hash = queryParams.get('course_hash');
  const lesson_hash = queryParams.get('lesson_hash');
  console.log('isPreview', isPreview)
  
  const [isRecording, setIsRecording] = useState(false);
  const [currentSentence, setCurrentSentence] = useState(1);
  const [sentences, setSentences] = useState([]);
  const [fullSentences, setFullSentences] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [openGenerateDialog, setOpenGenerateDialog] = useState(false);
  const [error, setError] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  useEffect(() => {
    if (lesson?.lesson_content) {
      let contentData = lesson.lesson_content;
      if (typeof contentData === 'string') {
        contentData = JSON.parse(contentData);
        console.log('contentData', contentData);
      }
      setVideoUrl(contentData.videoUrl || `${BASE_DATA_PATH}/course/${lesson.file_path}/index.mp4`);
      setSentences(contentData.sentences || []);
      setFullSentences(contentData.fullSentences || {});
    }
  }, [lesson]);

  if (!lesson) {
    return null;
  }

  const handleVideoError = (error) => {
    console.error("Error loading video:", error);
    // You might want to set some state here to show an error message to the user
  };

  const handleSaveEdits = async (editedSentences, editedFullSentences) => {
    try {
      setSentences(editedSentences);
      setFullSentences(editedFullSentences);

      await patch(`/lessons/${lesson_hash}/content`, {
        sentences: editedSentences,
        fullSentences: editedFullSentences
      });
    } catch (error) {
      console.error("Error saving edits:", error);
      // Handle error (e.g., show error message to user)
    }
  };

  const handleJsonConversion = () => {
    setOpenGenerateDialog(true);
  };

  const handleGeneratedContent = async (content) => {
    setError(null);
    
    try {
      // Validate that content is a string and can be parsed as JSON
      if (typeof content !== 'string') {
        throw new Error('Content must be a string');
      }

      let parsedContent;
      try {
        parsedContent = JSON.parse(content);
      } catch (parseError) {
        console.error('Invalid JSON format:', parseError);
        throw new Error('Invalid JSON format');
      }

      // Validate the structure of the parsed JSON
      if (!parsedContent || typeof parsedContent !== 'object') {
        throw new Error('Content must be a valid JSON object');
      }

      // Validate required properties and their structure
      if (!parsedContent.title || typeof parsedContent.title !== 'string') {
        throw new Error('Content must contain a valid title string');
      }

      if (!Array.isArray(parsedContent.sentences)) {
        throw new Error('Content must contain a sentences array');
      }

      // Validate each sentence object structure
      parsedContent.sentences.forEach((sentence, index) => {
        if (!sentence.hasOwnProperty('id') || 
            !sentence.hasOwnProperty('text') || 
            !sentence.hasOwnProperty('translate') ||
            !sentence.hasOwnProperty('start') ||
            !sentence.hasOwnProperty('end') ||
            !sentence.hasOwnProperty('phonetic')) {
          throw new Error(`Invalid sentence structure at index ${index}`);
        }
      });

      // Validate fullSentences structure
      if (!parsedContent.fullSentences || 
          !parsedContent.fullSentences.hasOwnProperty('id') ||
          !parsedContent.fullSentences.hasOwnProperty('text') ||
          !parsedContent.fullSentences.hasOwnProperty('start') ||
          !parsedContent.fullSentences.hasOwnProperty('end') ||
          !parsedContent.fullSentences.hasOwnProperty('phonetic')) {
        throw new Error('Invalid fullSentences structure');
      }

      console.log('generated content:', parsedContent);
      // Set preview content and show preview dialog
      setPreviewContent(parsedContent);
      setOpenGenerateDialog(false);
      setShowPreview(true);

    } catch (error) {
      console.error("Error handling generated content:", error);
      setError(error.message);
    }
  };

  // Add new handler for confirming the preview
  const handleConfirmPreview = async () => {
    try {
      await patch(`/lessons/${lesson_hash}/content`, {
        sentences: previewContent.sentences,
        fullSentences: previewContent.fullSentences
      });

      // Update local state
      setSentences(previewContent.sentences);
      setFullSentences(previewContent.fullSentences);
      setShowPreview(false);
      setPreviewContent(null);
    } catch (error) {
      console.error("Error saving content:", error);
      setError(error.message);
    }
  };

  const handleVideoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploadError(null);
      
      // Validate file type
      if (!validateFileType(file, ['mp4', 'mov', 'avi'])) {
        setUploadError('Please upload only MP4, MOV or AVI files');
        return;
      }

      // Upload file
      const result = await uploadFile(file, (progress) => {
        setUploadProgress(progress.percent);
      });

      // Update lesson content
      try {
        await patch(`/lessons/${lesson_hash}/content`, {
            videoUrl: result.url
        });
        
        // Reload the page to show new video
        window.location.reload();
      } catch (error) {
        console.error('Error updating lesson:', error);
        setUploadError('Failed to update lesson with new video');
      }

    } catch (error) {
      console.error('Error uploading video:', error);
      setUploadError(error.message || 'Failed to upload video');
    }
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden'
    }}>
      {videoUrl && (
        <Box sx={{maxHeight: '50vh'}}>
          <VideoPlayer 
            src={videoUrl}
          sentences={sentences}
          currentSentence={currentSentence}
          isRecording={isRecording}
          setIsRecording={setIsRecording}
          fullSentences={fullSentences}
          onError={handleVideoError}
          isMuted={isMuted}
          mode={mode}
          />
        </Box>
      )}
      {mode === 'edit' && (
        <Box sx={{ 
          mt: 2,
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          backgroundColor: 'background.paper',
          borderRadius: 1,
          border: '1px dashed',
          borderColor: 'divider'
        }}>
          <Button
            component="label"
            variant="contained"
            startIcon={<CloudUploadIcon />}
            sx={{ position: 'relative' }}
          >
            Upload New Video
            <input
              type="file"
              hidden
              accept="video/*"
              onChange={handleVideoUpload}
            />
          </Button>
          
          {uploadProgress > 0 && uploadProgress < 100 && (
            <Box sx={{ width: '100%', maxWidth: 400 }}>
              <LinearProgress 
                variant="determinate" 
                value={uploadProgress} 
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary" align="center">
                Uploading: {Math.round(uploadProgress)}%
              </Typography>
            </Box>
          )}

          {uploadError && (
            <Alert severity="error" onClose={() => setUploadError(null)}>
              {uploadError}
            </Alert>
          )}
        </Box>
      )}
      
      <Box sx={{ flexGrow: 1, overflow: 'auto', marginTop: '10px', minHeight: '50vh' }}>
        <RecordAudio 
          sentences={sentences}
          currentSentence={currentSentence}
          setCurrentSentence={setCurrentSentence}  
          isRecording={isRecording}
          setIsRecording={setIsRecording}
          fullSentences={fullSentences}
          setIsMuted={setIsMuted}
          mode={mode}
          setSentences={setSentences}
          setFullSentences={setFullSentences}
        />
      </Box>
      {mode == 'edit' && (
      <Box sx={{ 
        position: 'fixed',
        right: 20,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        zIndex: 1000
      }}>
        <IconButton 
          onClick={() => setShowEditor(true)}
          sx={{ 
            backgroundColor: 'primary.main',
            color: 'white',
            '&:hover': {
              backgroundColor: 'primary.dark',
            }
          }}
        >
          <EditIcon />
        </IconButton>
        <IconButton 
          onClick={handleJsonConversion}
          sx={{ 
            backgroundColor: 'primary.main',
            color: 'white',
            '&:hover': {
              backgroundColor: 'primary.dark',
            }
          }}
        >
          <TranslateIcon />
        </IconButton>
      </Box>
      )}
      <SentenceEditor 
        open={showEditor}
        sentences={sentences}
        fullSentences={fullSentences}
        onSave={handleSaveEdits}
        onClose={() => setShowEditor(false)}
      />
      <GenerateSentences 
        open={openGenerateDialog}
        onClose={() => setOpenGenerateDialog(false)}
        onGenerateContent={handleGeneratedContent}
      />
      <PreviewDialog 
        open={showPreview}
        onClose={() => setShowPreview(false)}
        previewContent={previewContent}
        onConfirm={handleConfirmPreview}
        error={error}
      />
    </Box>
  );
};

export default CourseRecord;
