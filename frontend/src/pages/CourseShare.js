import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { get } from '../api/index';
import { Container, CircularProgress } from '@mui/material';
import DubbingShare from '../components/share/DubbingShare';
import SpeakingShare from '../components/share/SpeakingShare';
const CourseShare = () => {
  const { hash } = useParams();
  const [loading, setLoading] = useState(true);
  const [lessonData, setLessonData] = useState(null);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await get(`/user-lessons/results/shared/${hash}`);
        if (result.status === 'success') {
          setLessonData(result.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (hash) {
      fetchData();
    }
  }, [hash]);

  return (
    <Container>
      {loading ? <CircularProgress /> : <>
        {lessonData?.lesson?.lesson_type.toLowerCase() === 'dubbing' && <DubbingShare lessonData={lessonData} hash={hash} />}
        {lessonData?.lesson?.lesson_type.toLowerCase() === 'speaking' && <SpeakingShare lessonData={lessonData} hash={hash} />}
      </>}
    </Container>
  );
};

export default CourseShare;
