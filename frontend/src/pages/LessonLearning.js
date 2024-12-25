import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, 
  Typography, 
  Button, 
  CircularProgress, 
  ToggleButtonGroup, 
  ToggleButton, 
  Fab, 
  Box, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  DialogContentText
} from '@mui/material';
import { get, put } from '../api/index.js';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DubbingLeaning from './DubbingLeaning.js';
import SpeakingLearning from './SpeakingLearning.js';
import CodingLearning from './CodingLearning.js'
import EditIcon from '@mui/icons-material/Edit';
import SchoolIcon from '@mui/icons-material/School';
import Storage from '../storage/index';
import BasicLearning from './BasicLearning.js';
import UserLessonPage from '../components/page/UserLessonPage';
import EditNoteIcon from '@mui/icons-material/EditNote';
import LessonContent from '../components/lesson/LessonContent';

const CourseLesson = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courseHash, setCourseHash] = useState(null);
  const [lessonHash, setLessonHash] = useState(null);
  const [mode, setMode] = useState('learn');
  const [user, setUser] = useState(null);
  const [isPreview, setIsPreview] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteMode, setNoteMode] = useState('view');
  const [isContentEditorOpen, setIsContentEditorOpen] = useState(false);
  const [studentHash, setStudentHash] = useState(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const lessonHash = searchParams.get('lesson_hash');
    const studentHash = searchParams.get('student_hash');
    const isPreviewParam = searchParams.get('is_preview') === 'true';
    setIsPreview(isPreviewParam);
    console.log('isPreview', isPreviewParam)

    
    console.log('courseHash', courseHash)
    setCourseHash(courseHash);
    setLessonHash(lessonHash);
    setStudentHash(studentHash);
    if (lessonHash) {
      fetchLessonDetails(lessonHash, isPreviewParam);
    } else {
      setError('Invalid URL parameters');
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    const fetchUser = async () => {
      const storedUserString = await Storage.get('user');
      if (storedUserString) {
        const storedUser = JSON.parse(storedUserString);
        setUser(storedUser);
      }
    };

    fetchUser();
  }, []);

  const fetchLessonDetails = async (lessonHash, isPreview) => {
    console.log('fetchLessonDetails', lessonHash, isPreview)
    try {
      let result;
      if (isPreview) {
        result = await get(`/lessons/${lessonHash}`);
      } else {
        result = await get(`/user-lessons/${lessonHash}`);
      }
      if (result.data) {
        if (!('hash' in result.data) && ('lesson_hash' in result.data)) {
          result.data.hash = result.data.lesson_hash;
        }
        setLesson(result.data);
        setCourseHash(result.data.from_course);
      } else {
        throw new Error('Invalid data structure received');
      }
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleModeChange = (event, newMode) => {
    if (newMode !== null) {
      setMode(newMode);
    }
  };

  const handleNavigation = () => {
    if (isPreview) {
      if (courseHash) {
        return navigate(`/courses/?hash=${courseHash}`);
      }
      return navigate(`/lessons-list`);
    } 
    return navigate('/user-lessons');
  };

  const handleLessonContentSave = async (updatedContent) => {
    try {
      await put(`/lessons/${lessonHash}`, {
        lesson_content: updatedContent
      });
      
      // Update the lesson state with new content
      setLesson(prev => ({
        ...prev,
        lesson_content: updatedContent
      }));

      return true; // Indicate success
    } catch (error) {
      console.error('Failed to save lesson content:', error);
      throw error; // Propagate error to LessonContent component
    }
  };

  if (loading) {
    return (
      <Container>
        <CircularProgress sx={{ mt: 4 }} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Typography variant="h6" color="error" align="center" sx={{ mt: 4 }}>
          {error}
        </Typography>
      </Container>
    );
  }

  if (!lesson) {
    return (
      <Container>
        <Typography variant="h6" color="error" align="center" sx={{ mt: 4 }}>
          No lesson details available.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleNavigation}
        >
          Back to Course
        </Button>

        {isPreview && user?.role === 'admin' && (
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            aria-label="lesson mode"
          >
            <ToggleButton value="learn" aria-label="learn mode">
              <SchoolIcon sx={{ mr: 1 }} />
              Learn
            </ToggleButton>
            <ToggleButton value="edit" aria-label="edit mode">
              <EditIcon sx={{ mr: 1 }} />
              Edit
            </ToggleButton>
          </ToggleButtonGroup>
        )}
      </div>

      {lesson.lesson_type.toLowerCase() === 'dubbing' && (
        <DubbingLeaning lesson={lesson} mode={mode}/>
      )}
      {lesson.lesson_type.toLowerCase() === 'speaking' && (
        <SpeakingLearning lesson={lesson}  mode={mode} />
      )}
      {lesson.lesson_type.toLowerCase() === 'coding' && (
        <CodingLearning lesson={lesson}  mode={mode} />
      )}
      {lesson.lesson_type.toLowerCase() === 'basic' && (
        <BasicLearning lesson={lesson} mode={mode} />
      )}

      <div style={{ 
        ...(noteMode === 'edit' && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1300,
        })
      }}>
        <div style={{
          ...(noteMode === 'edit' ? {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto'
          } : {
            marginTop: '2rem'
          })
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px' 
          }}>
            <Typography variant="h6" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {noteMode === 'edit' ? 'Edit Notes' : (
                <>
                  My Notes
                  <EditIcon 
                    style={{ cursor: 'pointer' }} 
                    onClick={() => setNoteMode('edit')}
                  />
                </>
              )}
            </Typography>
            {noteMode === 'edit' && (
              <Button onClick={() => setNoteMode('view')}>Close</Button>
            )}
          </div>

          <UserLessonPage
            lesson={lesson}
            studentHash={studentHash}
            mode={noteMode}
            focusContent={true}
            setMarkdownContent={setNoteContent}
          />
        </div>
      </div>

      { (isPreview && user?.role === 'admin') && (
        <Box
          sx={{
            position: 'fixed',
          left: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          zIndex: 1200,
        }}
      >
        <Fab
          color="primary"
          size="medium"
          onClick={() => setIsContentEditorOpen(true)}
          title="Edit Lesson Content"
        >
          <EditNoteIcon />
          </Fab>
        </Box>
      )}

      <Dialog
        fullScreen
        open={isContentEditorOpen}
        onClose={() => setIsContentEditorOpen(false)}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Edit Lesson Content
          <Button onClick={() => setIsContentEditorOpen(false)} color="inherit">
            Close
          </Button>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '100%', maxWidth: '100%' }}>
          <LessonContent
            mode={mode}
            lessonHash={lesson.hash}
            lessonType={lesson.lesson_type}
            lessonContent={lesson.lesson_content}
            onSave={handleLessonContentSave}
          />
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default CourseLesson;
