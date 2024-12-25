import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../api';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  CircularProgress,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import { AssessmentOutlined, CodeRounded, TranslateRounded, QuizRounded, SchoolRounded } from '@mui/icons-material';
import IconButton from '@mui/material/IconButton';
import NoImage from '../../resources/no-image.png';
import { useTranslation } from 'react-i18next';

const getLessonTypeConfig = (type) => {
  switch (type?.toUpperCase()) {
    case 'DUBBING':
      return {
        icon: <TranslateRounded fontSize="small" />,
        sx: {
          backgroundColor: '#FFF4DE',
          color: '#FFB000',
          '& .MuiChip-icon': {
            color: '#FFB000'
          }
        }
      };
    case 'SPEAKING':
      return {
        icon: <TranslateRounded fontSize="small" />,
        sx: {
          backgroundColor: '#E8F5E9',
          color: '#2E7D32',
          '& .MuiChip-icon': {
            color: '#2E7D32'
          }
        }
      };
    case 'CODING':
      return {
        icon: <CodeRounded fontSize="small" />,
        sx: {
          backgroundColor: '#EDE7F6',
          color: '#673AB7',
          '& .MuiChip-icon': {
            color: '#673AB7'
          }
        }
      };
    case 'BASIC':
      return {
        icon: <TranslateRounded fontSize="small" />,
        sx: {
          backgroundColor: '#E3F2FD',
          color: '#1976D2',
          '& .MuiChip-icon': {
            color: '#1976D2'
          }
        }
      };
    default:
      return {
        icon: null,
        sx: {
          backgroundColor: '#E0E0E0',
          color: '#757575'
        }
      };
  }
};

const UserLessons = () => {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({
    pageSize: 9,
    offset: 0,
    totalCount: 0
  });
  const [tabValue, setTabValue] = useState(0);
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const user = userStr ? (
    typeof JSON.parse(userStr) === 'string' ? 
      JSON.parse(JSON.parse(userStr)) : 
      JSON.parse(userStr)
  ) : null;
  const isTeacher = user && typeof user === 'object' && ['teacher', 'admin'].includes(user.role);
  console.log('isTeacher', isTeacher, user, typeof user);
  const { t } = useTranslation();


  const fetchLessons = async (isLoadMore = false, newOffset = null) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams({
        limit: pagination.pageSize,
        offset: newOffset ?? pagination.offset,
      });

      if (tabValue === 0) {
        params.append('current_user', 'true');
        params.append('current_teacher', 'false');
      } else {
        params.append('current_user', 'false');
        params.append('current_teacher', 'true');
      }

      const response = await get(`/user-lessons?${params.toString()}`);
      
      if (response.data) {
        setLessons(prev => isLoadMore ? [...prev, ...response.data.items] : response.data.items || []);
        setPagination(prev => ({
          ...prev,
          offset: newOffset ?? prev.offset,
          totalCount: response.data.total,
          hasMore: response.data.has_more
        }));
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoadingMore(false);
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPagination(prev => ({ ...prev, offset: 0 }));
    setLessons([]);
  };

  useEffect(() => {
    fetchLessons();
  }, [tabValue]);

  const handleLoadMore = () => {
    const newOffset = pagination.offset + pagination.pageSize;
    fetchLessons(true, newOffset);
  };

  const handleLessonClick = (lesson) => {
    console.log(lesson);
    if (tabValue === 0) {
      navigate(`/lessons?lesson_hash=${lesson.lesson_hash}`);
    } else {
      navigate(`/lessons?lesson_hash=${lesson.lesson_hash}&student_hash=${lesson.user_hash}`);
    }
  };

  if (loading && !lessons.length) {
    return <div>Loading...</div>;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('my-lessons')}
      </Typography>

      {isTeacher ? (
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{ mb: 3 }}
          variant="fullWidth"
        >
          <Tab label={t('my-lessons')} />
          <Tab label={t('my-student-lessons')} />
        </Tabs>
      ) : null}

      {lessons.length === 0 ? (
        <Box textAlign="center" mt={4}>
          <Typography variant="h6" color="textSecondary">
            {tabValue === 0 
              ? "You haven't enrolled in any lessons yet."
              : "You don't have any student lessons yet."}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/lessons')}
            sx={{ mt: 2 }}
          >
            Browse Lessons
          </Button>
        </Box>
      ) : (
        <div>
          <Grid container spacing={3}>
            {lessons.map((lesson) => (
              <Grid item xs={12} sm={6} md={4} key={lesson.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 3,
                      transition: 'all 0.3s ease-in-out',
                    },
                  }}
                  onClick={() => handleLessonClick(lesson)}
                >
                  <Box
                    sx={{
                      height: 140,
                      width: '100%',
                      backgroundColor: 'background.paper',
                      backgroundImage: `url(${lesson.thumbnail_path || NoImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}
                  />
                  <CardContent>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {lesson.title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" paragraph>
                      {lesson.description}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      {tabValue === 0 
                        ? `${t('teacher')}: ${lesson.teacher?.full_name || 'Unknown Teacher'}`
                        : `${t('student')}: ${lesson.student?.full_name || 'Unknown Student'}`
                      }
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <Typography variant="body2" color="primary">
                          {t('progress')}: {lesson.progress || 0}%
                        </Typography>
                        <Chip
                          icon={getLessonTypeConfig(lesson.lesson_type).icon}
                          label={lesson.lesson_type}
                          size="small"
                          sx={{
                            fontWeight: 500,
                            '& .MuiChip-label': {
                              px: 1
                            },
                            ...getLessonTypeConfig(lesson.lesson_type).sx
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', gap: 1 }}>
                        {lesson.from_course && (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/courses/?hash=${lesson.from_course}`);
                            }}
                            sx={{
                              '&:hover': {
                                backgroundColor: 'rgba(25, 118, 210, 0.04)',
                              },
                            }}
                          >
                            <SchoolRounded />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/lesson-results?lesson_hash=${lesson.lesson_hash}`);
                          }}
                          sx={{
                            '&:hover': {
                              backgroundColor: 'rgba(25, 118, 210, 0.04)',
                            },
                          }}
                        >
                          <AssessmentOutlined />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Showing {lessons.length} of {pagination.totalCount} lessons
            </Typography>
            
            {pagination.hasMore && (
              <Button
                variant="outlined"
                onClick={handleLoadMore}
                disabled={loadingMore}
                startIcon={loadingMore && <CircularProgress size={20} />}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </Button>
            )}
          </Box>
        </div>
      )}
    </Container>
  );
};

export default UserLessons;
