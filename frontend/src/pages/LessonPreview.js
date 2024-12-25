import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Typography, Button, CircularProgress } from '@mui/material';
import { get } from '../api/index.js';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CourseRecord from './DubbingLeaning.js';
import CourseSpeak from './SpeakingLearning.js';
import CourseCoding from './CourseCoding.js';

const LessonPreview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courseHash, setCourseHash] = useState(null);
  const [lessonHash, setLessonHash] = useState(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const courseHash = searchParams.get('course_hash');
    const lessonHash = searchParams.get('lesson_hash');

    setCourseHash(courseHash);
    setLessonHash(lessonHash);
    if (lessonHash) {
      fetchLessonDetails(lessonHash);
    } else {
      setError('Invalid URL parameters');
      setLoading(false);
    }
  }, [location]);

  const fetchLessonDetails = async (lessonHash) => {
    try {
      const result = await get(`/lessons/${lessonHash}`);
      if (result.data) {
        setLesson(result.data);
      } else {
        throw new Error('Invalid data structure received');
      }
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
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
          onClick={() => navigate(courseHash ? `/courses/?hash=${courseHash}` : '/lessons')}
        >
          Back to Course
        </Button>
      </div>

      {lesson.lesson_type.toLowerCase() === 'dubbing' && (
        <CourseRecord course={lesson} mode="preview" />
      )}
      {lesson.lesson_type.toLowerCase() === 'speaking' && (
        <CourseSpeak lesson={lesson} courseId={courseHash} lessonId={lessonHash} mode="preview" />
      )}
      {lesson.lesson_type.toLowerCase() === 'coding' && (
        <CourseCoding lesson={lesson} courseId={courseHash} lessonId={lessonHash} mode="preview" />
      )}
    </Container>
  );
};

export default LessonPreview;
