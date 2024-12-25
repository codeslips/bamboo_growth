import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Typography, Card, CardContent, CardMedia, Grid, Button, CircularProgress, Box, Divider, Chip, IconButton, Switch, FormControlLabel } from '@mui/material';
import { get, put, post, post_json } from '../api/index.js';
import SchoolIcon from '@mui/icons-material/School';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import { BASE_URL, BASE_DATA_PATH } from '../api/index.js';
import ListAltIcon from '@mui/icons-material/ListAlt';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import EditIcon from '@mui/icons-material/Edit';
import CourseEditor from '../components/course/CourseEditor.js';
import Storage from '../storage/index';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SingleCourseEditor from '../components/course/SingleCourseEditor';

const CourseDetail = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const hash = searchParams.get('hash');
  const navigate = useNavigate();
  const [course, setCourse] = useState(location.state?.course || null);
  const [personalCourse, setPersonalCourse] = useState(null);
  const [loading, setLoading] = useState(!course);
  const [error, setError] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [mode, setMode] = useState('view');
  const [user, setUser] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [lessons, setLessons] = useState([]);

  console.log(hash);
  useEffect(() => {
    if (user) {
      if (!course) {
        fetchCourseDetails();
      }
      fetchPersonalCourse();
    }
  }, [user]);

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

  const fetchCourseDetails = async () => {
    try {
      const result = await get(`/course/${hash}`);
      if (result.data) {
        setCourse(result.data);
      } else {
        throw new Error('Invalid data structure received');
      }
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchPersonalCourse = async () => {
    if (!user?.id) return;
    
    try {
      const result = await get(`/user-lessons?from_course=${hash}`);
      if (result.data) {
        setPersonalCourse(result.data);
        if (!result.data || result.data.length === 0 || user?.role === 'admin') {
          fetchLessons();
        }
      }
    } catch (err) {
      console.error("Error fetching personal course data:", err);
      fetchLessons();
    }
  };

  const fetchLessons = async () => {
    try {
      const result = await get(`/course/${hash}/lessons?is_published=true&created_by=SYSTEM`);
      if (result.data) {
        const transformedLessons = result.data.map(lesson => ({
          id: lesson.lesson_hash,
          title: lesson.title,
          description: lesson.description,
          is_show: lesson.is_visible,
          hash: lesson.lesson_hash,
          lesson_type: lesson.lesson_type,
          file_path: lesson.file_path,
          duration_minutes: lesson.duration_minutes,
          order_index: lesson.order_index,
          is_active: lesson.is_active,
          is_preview: lesson.is_preview,
          is_published: lesson.is_published,
          created_by: lesson.created_by,
          from_course: lesson.from_course
        }));
        setLessons(transformedLessons);
      }
    } catch (err) {
      console.error("Error fetching lessons:", err);
      setError(err.message);
    }
  };

  const handleSaveEdits = async (editedCourse) => {
    try {
      const { lessons: _, ...courseDetails } = editedCourse;
      const result = await put(`/course/${hash}`, courseDetails);
      if (result.data) {
        setCourse(result.data);
      }
    } catch (error) {
      console.error("Error saving course edits:", error);
      // Handle error (e.g., show error message to user)
    }
  };

  const handleLessonSave = async (lessonData) => {
    try {
      const result = await put(`/course/${hash}/lessons/${lessonData.hash}`, lessonData);
      if (result.data) {
        setLessons(lessons.map(lesson => 
          lesson.id === lessonData.id ? result.data : lesson
        ));
      }
    } catch (error) {
      console.error("Error saving lesson:", error);
      throw error; // Propagate error to handle it in the calling function
    }
  };

  const handleMenuClick = (event, lesson) => {
    setEditingLesson(lesson);
    setEditDialogOpen(true);
  };

  const handleEditSave = async (updatedLesson) => {
    try {
      await handleLessonSave(updatedLesson);
      setEditDialogOpen(false);
      setEditingLesson(null);
    } catch (error) {
      console.error("Error saving lesson edits:", error);
      // You might want to show an error message to the user here
    }
  };

  const handleEnrollment = async () => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    try {
      const enrollmentData = {
        user_hash: user.hash,
        course_hash: hash
      };

      const result = await post_json('/user_courses', enrollmentData);
      if (result.data) {
        fetchPersonalCourse();
        alert('Successfully enrolled in the course!');
      }
    } catch (error) {
      console.error('Error enrolling in course:', error);
      alert('Failed to enroll in the course. Please try again.');
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

  if (!course) {
    return (
      <Container>
        <Typography variant="h6" color="error" align="center" sx={{ mt: 4 }}>
          No course details available.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Card
        sx={{
          display: 'flex',
          marginTop: 4,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          borderRadius: 4,
          overflow: 'hidden',
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <CardContent
          sx={{
            flex: '1 0 auto',
            padding: 4,
            position: 'relative',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: 'white',
            backgroundImage: `url(${BASE_DATA_PATH}/course/${course.folder_name}/bg.jpg)`,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              zIndex: 1,
            },
            '& > *': {
              position: 'relative',
              zIndex: 2,
            },
          }}
        >
          <Typography variant="h2" gutterBottom fontWeight="bold" color="white">
            {course.title}
          </Typography>
          <Chip label={course.language} color="primary" sx={{ mb: 2 }} />
          {course.difficulty && (
            <Chip 
              label={course.difficulty} 
              color="secondary" 
              sx={{ mb: 2, ml: 1 }} 
            />
          )}
          <Typography variant="body1" paragraph color="white">
            {course.description}
          </Typography>
          <Divider sx={{ my: 2, bgcolor: 'rgba(255, 255, 255, 0.2)' }} />
          <Box sx={{ mb: 2 }}>
            {course.prerequisites && (
              <Typography variant="body2" color="white" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PersonIcon /> Prerequisites: {course.prerequisites}
              </Typography>
            )}
            {course.duration_hours > 0 && (
              <Typography variant="body2" color="white" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AccessTimeIcon /> Duration: {course.duration_hours} hours
              </Typography>
            )}
            {course.enrollment_count > 0 && (
              <Typography variant="body2" color="white" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <SchoolIcon /> Enrolled: {course.enrollment_count} students
              </Typography>
            )}
          </Box>
          <Grid container spacing={2}>
            <Grid item>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<SchoolIcon />}
                onClick={handleEnrollment}
                disabled={personalCourse && personalCourse.length > 0}
              >
                {personalCourse && personalCourse.length > 0 ? 'Already Enrolled' : 'Enroll Now'}
              </Button>
            </Grid>
            <Grid item>
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={() => navigate('/course-list')}
                sx={{ color: 'white', borderColor: 'white' }}
              >
                Back to Course List
              </Button>
            </Grid>
            {['admin', 'teacher'].includes(user?.role) && (
              <Grid item>
                <FormControlLabel
                  control={
                    <Switch
                      checked={mode === 'edit'}
                      onChange={(e) => setMode(e.target.checked ? 'edit' : 'view')}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: 'white',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: 'white',
                        },
                        '& .MuiSwitch-switchBase': {
                          color: 'white',
                        },
                        '& .MuiSwitch-track': {
                          backgroundColor: 'white',
                        }
                      }}
                    />
                  }
                  label={<Typography sx={{ color: 'white' }}>Edit Mode</Typography>}
                />
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mt: 4, mb: 4, p: 3, backgroundColor: 'background.default', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', borderRadius: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <ListAltIcon fontSize="large" color="primary" />
          </Grid>
          <Grid item xs>
            <Typography variant="h5" component="div" gutterBottom>
              Course Summary
            </Typography>
            <Typography variant="body1" color="text.secondary">
              This course contains {lessons.length} lessons, covering various aspects of {course.title}.
            </Typography>
          </Grid>
          <Grid item>
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<SchoolIcon />}
              onClick={() => {
                document.getElementById('course-lessons').scrollIntoView({ behavior: 'smooth' });
              }}
            >
              View Lessons
            </Button>
          </Grid>
        </Grid>
      </Card>

      {personalCourse && personalCourse.length > 0 && (
        <>
          <Typography variant="h4" gutterBottom sx={{ mt: 6, mb: 3, fontWeight: 'bold' }}>
            Your Personal Progress
          </Typography>
          <Grid container spacing={3}>
            {personalCourse.map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item.id}>
                <Card sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                  },
                  backgroundColor: 'primary.light',
                  color: 'primary.contrastText',
                }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>{item.title}</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {item.description || 'No description available'}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTimeIcon fontSize="small" />
                        Status: {item.status.replace('_', ' ')}
                      </Typography>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SchoolIcon fontSize="small" />
                        Progress: {item.progress}%
                      </Typography>
                    </Box>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Last accessed: {new Date(item.last_accessed).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                  <Box sx={{ p: 2, mt: 'auto' }}>
                    <Button 
                      variant="contained" 
                      color="secondary"
                      fullWidth
                      startIcon={<BookmarkIcon />}
                      onClick={() => navigate(`/lessons/?lesson_hash=${item.lesson_hash}&course_hash=${hash}`)}
                    >
                      {item.status === 'not_started' ? 'Start Learning' : 'Continue Learning'}
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      <Typography id="course-lessons" variant="h4" gutterBottom sx={{ mt: 6, mb: 3, fontWeight: 'bold' }}>
        Course Lessons
      </Typography>
      <Grid container spacing={3}>
        {lessons.map((lesson) => (
          (lesson.is_show || mode === 'edit') && (
            <Grid item xs={12} sm={6} md={4} key={lesson.id}>
              <Card sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                },
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: mode === 'edit' && !lesson.is_show 
                    ? 'rgba(255, 0, 0, 0.15)' 
                    : 'rgba(0, 0, 0, 0.05)',
                  zIndex: 1,
                },
                '& > *': {
                  position: 'relative',
                  zIndex: 2,
                },
                backgroundImage: `url(${BASE_DATA_PATH}/course/${lesson.file_path}/bg.jpg)`,
                border: mode === 'edit' && !lesson.is_show ? '2px dashed #ff0000' : 'none',
              }}>
                <CardContent>
                  {mode === 'edit' && ['admin', 'teacher'].includes(user?.role) && (
                    <>
                      <IconButton
                        onClick={(e) => handleMenuClick(e, lesson)}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 3,
                          color: 'white',
                          backgroundColor: 'rgba(0, 0, 0, 0.2)',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                          }
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      {!lesson.is_show && (
                        <Chip
                          label="Hidden"
                          color="error"
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            zIndex: 3,
                          }}
                        />
                      )}
                    </>
                  )}
                  <Typography variant="h6" gutterBottom color="white">{lesson.title}</Typography>
                  <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" sx={{ mb: 2 }}>
                    {lesson.description || 'No description available.'}
                  </Typography>
                </CardContent>
                <Box sx={{ p: 2, mt: 'auto', visibility: ['admin', 'teacher'].includes(user?.role) ? 'visible' : 'hidden' }}>
                  <Button 
                    variant="contained" 
                    color="primary"
                    fullWidth
                    onClick={() => navigate(`/lessons/?lesson_hash=${lesson.hash}&course_hash=${hash}&page_hash=${lesson.hash}`)}
                  >
                    View Lesson
                  </Button>
                </Box>
              </Card>
            </Grid>
          )
        ))}
      </Grid>
      
      {mode === 'edit' && ['admin', 'teacher'].includes(user?.role) && (
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
        </Box>
      )}

      <CourseEditor 
        open={showEditor}
        course={course}
        onSave={handleSaveEdits}
        onClose={() => setShowEditor(false)}
      />

      <SingleCourseEditor
        open={editDialogOpen}
        lesson={editingLesson}
        onSave={handleEditSave}
        onClose={() => setEditDialogOpen(false)}
        course_hash={hash}
      />
    </Container>
  );
};

export default CourseDetail;
