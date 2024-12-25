import React, { useState, useEffect } from 'react';
import { Container, Typography, Grid, Card, CardContent, CardActions, Button, CircularProgress, Box, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { get, BASE_URL } from '../api/index.js';
import SchoolIcon from '@mui/icons-material/School';
import LanguageIcon from '@mui/icons-material/Language';
import bgImage from '../../resources/bg.jpg';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.3s cubic-bezier(.25,.8,.25,1)',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 12px 20px rgba(0,0,0,0.1)',
  },
  borderRadius: theme.spacing(2),
  overflow: 'hidden',
}));

const StyledCardContent = styled(CardContent)({
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
});

const CourseImage = styled('div')(({ theme }) => ({
  height: 140,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  marginBottom: theme.spacing(2),
}));

const CourseList = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const result = await get('/course/list');
      console.log(result);
      if (Array.isArray(result.data)) {
        setCourses(result.data);
      } else {
        throw new Error('Invalid data structure received');
      }
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  const handleLearnMore = (courseHash) => {
    navigate(`/courses/?hash=${courseHash}`);
  };

  if (loading) {
    return (
      <Container>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Typography variant="h4">Course List</Typography>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h3" gutterBottom align="center" fontWeight="bold">
          Explore Our Courses
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" paragraph>
          Discover a world of knowledge with our diverse range of courses
        </Typography>
      </Box>
      <Grid container spacing={4}>
        {courses.map((course) => (
          <Grid item key={course.id} xs={12} sm={6} md={4}>
            <StyledCard>
              <CourseImage 
                style={{ 
                  backgroundImage: `url(${course.thumbnail || bgImage})` 
                }} 
              />
              <StyledCardContent>
                <Typography variant="h5" component="div" gutterBottom fontWeight="bold">
                  {course.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {course.description}
                </Typography>
                <Box mt="auto" display="flex" gap={1} flexWrap="wrap">
                  <Chip
                    icon={<LanguageIcon />}
                    label={course.language}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    icon={<SchoolIcon />}
                    label={`${course.duration_hours}h`}
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                  <Chip
                    label={course.difficulty}
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                </Box>
              </StyledCardContent>
              <CardActions>
                <Button 
                  fullWidth
                  variant="contained"
                  color="primary" 
                  onClick={() => handleLearnMore(course.hash)}
                >
                  Learn More
                </Button>
              </CardActions>
            </StyledCard>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

// Remove PropTypes and defaultProps
export default CourseList;