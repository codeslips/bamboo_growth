import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  IconButton,
  Pagination
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { get, post_json, put, del } from '../api';
import { uploadFile, validateFileType } from '../api/objects';
import { alpha } from '@mui/material/styles';
import LessonUsers from '../components/lesson/LessonUsers.js';
import NoImage from '../../resources/no-image.png';
import ObjectsUpload from '../components/utils/ObjectsUpload';
import Notify from '../components/common/Notify';

const LESSON_TYPES = ['DUBBING', 'SPEAKING', 'CODING', 'BASIC'];
const ALL_LESSON_TYPES = ['DUBBING', 'READING', 'LISTENING', 'SPEAKING', 'QUIZ', 'VIDEO', 'EXERCISE'];

const LESSON_TYPE_COLORS = {
  DUBBING: {
    bg: '#FFF4DE',
    text: '#FFB000'
  },
  SPEAKING: {
    bg: '#E8F5E9',
    text: '#2E7D32'
  },
  CODING: {
    bg: '#EDE7F6',
    text: '#673AB7'
  },
  BASIC: {
    bg: '#E3F2FD',
    text: '#1976D2'
  },
  default: {
    bg: '#F5F5F5',
    text: '#666666'
  }
};

const defaultLessonForm = {
  title: '',
  lesson_type: '',
  description: '',
  duration_minutes: '',
  is_preview: false,
  is_published: false,
  thumbnail_path: ''
};

const Lessons = () => {
  const [lessons, setLessons] = useState([]);
  const [filters, setFilters] = useState({
    lesson_type: '',
    is_preview: null,
    is_published: null
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [lessonForm, setLessonForm] = useState(defaultLessonForm);
  const [isEditing, setIsEditing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 9,
    totalCount: 0,
    totalPages: 0
  });
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showUsers, setShowUsers] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  useEffect(() => {
    fetchLessons();
  }, [filters, pagination.page]);

  const fetchLessons = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.lesson_type) {
        params.append('lesson_type', filters.lesson_type);
      }
      if (filters.is_preview !== null) {
        params.append('is_preview', filters.is_preview);
      }
      if (filters.is_published !== null) {
        params.append('is_published', filters.is_published);
      }
      
      params.append('page', pagination.page);
      params.append('page_size', pagination.pageSize);

      const response = await get(`/lessons/search?${params.toString()}`);
      
      if (response.data && response.data.items && response.data.pagination) {
        setLessons(response.data.items);
        setPagination(prev => ({
          ...prev,
          totalCount: response.data.pagination.total_count,
          totalPages: response.data.pagination.total_pages,
          page: response.data.pagination.page,
          pageSize: response.data.pagination.page_size
        }));
      } else {
        console.error('Invalid response format from server');
        setSnackbar({ 
          open: true, 
          message: 'Error loading lessons: Invalid server response', 
          severity: 'error' 
        });
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error loading lessons: ' + (error.message || 'Unknown error'), 
        severity: 'error' 
      });
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 
      ? `${hours}h ${remainingMinutes}m`
      : `${remainingMinutes}m`;
  };

  const handleOpenDialog = (lesson = null) => {
    if (lesson) {
      setLessonForm(lesson);
      setIsEditing(true);
    } else {
      setLessonForm(defaultLessonForm);
      setIsEditing(false);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setLessonForm(defaultLessonForm);
    setIsEditing(false);
  };

  const handleFormChange = (field, value) => {
    setLessonForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      if (isEditing) {
        await put(`/lessons/${lessonForm.hash}`, lessonForm);
        setSnackbar({ open: true, message: 'Lesson updated successfully', severity: 'success' });
      } else {
        await post_json('/lessons', lessonForm);
        setSnackbar({ open: true, message: 'Lesson created successfully', severity: 'success' });
      }
      handleCloseDialog();
      fetchLessons();
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'An error occurred', severity: 'error' });
    }
  };

  const handleToggleStatus = async (lesson, field, value) => {
    try {
      await post_json(`/lessons/${lesson.hash}/toggle-status`, {
        status_field: field,
        value: value
      });
      fetchLessons();
      setSnackbar({ open: true, message: 'Status updated successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'An error occurred', severity: 'error' });
    }
  };

  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleShowUsers = (lesson) => {
    setSelectedLesson(lesson);
    setShowUsers(true);
  };

  const handleCloseUsers = () => {
    setShowUsers(false);
    setSelectedLesson(null);
  };

  const handleDeleteClick = (lesson) => {
    setLessonToDelete(lesson);
    setDeleteDialogOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
    setLessonToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    try {
      await del(`/lessons/${lessonToDelete.hash}`);

      // Remove the lesson from the list
      setLessons(lessons.filter(lesson => lesson.hash !== lessonToDelete.hash));
      
      // Show success message
      setSnackbar({
        open: true,
        message: 'Lesson deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting lesson:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to delete lesson',
        severity: 'error'
      });
    } finally {
      handleDeleteClose();
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      // Validate file type
      if (!validateFileType(file, ['jpg', 'jpeg', 'png'])) {
        setSnackbar({
          open: true,
          message: 'Please upload only JPG, JPEG or PNG files',
          severity: 'error'
        });
        return;
      }

      // Upload file
      const result = await uploadFile(file, (progress) => {
        console.log('Upload progress:', progress.percent + '%');
      });

      setLessonForm(prev => ({
        ...prev,
        thumbnail_path: result.url
      }));
      
      setSnackbar({
        open: true,
        message: 'Image uploaded successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      setSnackbar({
        open: true,
        message: 'Failed to upload image: ' + error.message,
        severity: 'error'
      });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 6,
          borderBottom: '2px solid',
          borderColor: 'primary.light',
          pb: 2
        }}
      >
        <Typography 
          variant="h4" 
          component="h1"
          sx={{ 
            fontWeight: 600,
            color: 'primary.main'
          }}
        >
          Lessons
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1,
            boxShadow: 2,
            '&:hover': {
              transform: 'translateY(-2px)',
              transition: 'transform 0.2s'
            }
          }}
        >
          Create Lesson
        </Button>
      </Box>

      <Box sx={{ mb: 6, backgroundColor: 'background.paper', p: 3, borderRadius: 2, boxShadow: 1 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Lesson Type</InputLabel>
              <Select
                value={filters.lesson_type}
                label="Lesson Type"
                onChange={(e) => handleFilterChange('lesson_type', e.target.value)}
                sx={{ borderRadius: 1 }}
              >
                <MenuItem value="">All Types</MenuItem>
                {LESSON_TYPES.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={filters.is_preview === true}
                  onChange={(e) => handleFilterChange('is_preview', e.target.checked)}
                  color="primary"
                />
              }
              label="Preview Only"
              sx={{ '& .MuiTypography-root': { color: 'text.secondary' } }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={filters.is_published === true}
                  onChange={(e) => handleFilterChange('is_published', e.target.checked)}
                  color="primary"
                />
              }
              label="Published Only"
              sx={{ '& .MuiTypography-root': { color: 'text.secondary' } }}
            />
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={3}>
        {lessons.map((lesson) => (
          <Grid item xs={12} sm={6} md={4} key={lesson.hash}>
            <Card 
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease-in-out',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'background.paper',
                position: 'relative',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: theme => `0 12px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                  borderColor: 'primary.main',
                }
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <Box
                  sx={{
                    height: 100,
                    width: '100%',
                    backgroundColor: 'background.paper',
                    backgroundImage: `url(${lesson.thumbnail_path || NoImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                  }}
                />
                <Box sx={{ 
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  display: 'flex',
                  gap: 1,
                  zIndex: 2
                }}>
                  <IconButton 
                    size="small" 
                    onClick={() => handleOpenDialog(lesson)}
                    sx={{ 
                      color: 'text.secondary',
                      backgroundColor: 'transparent',
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { 
                        backgroundColor: 'action.hover',
                        transform: 'rotate(15deg)',
                        transition: 'transform 0.2s'
                      }
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => handleDeleteClick(lesson)}
                    sx={{ 
                      color: 'text.secondary',
                      backgroundColor: 'transparent',
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { 
                        backgroundColor: 'action.hover',
                        transform: 'rotate(15deg)',
                        transition: 'transform 0.2s'
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              <CardContent 
                sx={{ 
                  flexGrow: 1, 
                  p: 3,
                  position: 'relative',
                  zIndex: 1,
                  backgroundColor: 'background.paper',
                  borderRadius: 2,
                }}
              >
                <Typography 
                  variant="h6" 
                  component="h2" 
                  sx={{ 
                    fontWeight: 600,
                    color: 'text.primary',
                    fontSize: '1.1rem',
                    lineHeight: 1.3,
                    mb: 2.5
                  }}
                >
                  {lesson.title}
                </Typography>
                <Typography 
                  sx={{ 
                    display: 'inline-block',
                    backgroundColor: (theme) => 
                      LESSON_TYPE_COLORS[lesson.lesson_type]?.bg || LESSON_TYPE_COLORS.default.bg,
                    color: LESSON_TYPE_COLORS[lesson.lesson_type]?.text || LESSON_TYPE_COLORS.default.text,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    mb: 2,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  {lesson.lesson_type}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    mb: 2,
                    fontSize: '0.875rem'
                  }}
                >
                  <Box component="span" 
                    sx={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      backgroundColor: 'primary.main',
                      display: 'inline-block'
                    }} 
                  />
                  Duration: {formatDuration(lesson.duration_minutes)}
                </Typography>
                {lesson.description && (
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mb: 2.5,
                      color: 'text.secondary',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.6,
                      fontSize: '0.875rem'
                    }}
                  >
                    {lesson.description}
                  </Typography>
                )}
                <Box
                  sx={{
                    mb: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    backgroundColor: theme => alpha(theme.palette.primary.main, 0.05),
                    borderRadius: 1,
                    py: 0.75,
                    px: 1.5,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'primary.main',
                      fontSize: '0.813rem',
                      fontWeight: 500,
                    }}
                  >
                    Created by:
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.primary',
                      fontSize: '0.813rem',
                    }}
                  >
                    {lesson.created_by || 'Unknown'}
                  </Typography>
                </Box>
                <Box sx={{ 
                  mt: 'auto',
                  display: 'flex',
                  gap: 3,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  pt: 2,
                  px: 1,
                  opacity: 0,
                  transition: 'opacity 0.2s ease-in-out',
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 6,
                  backgroundColor: 'background.paper',
                  '.MuiCard-root:hover &': {
                    opacity: 1
                  }
                }}>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={lesson.is_preview}
                        onChange={(e) => handleToggleStatus(lesson, 'is_preview', e.target.checked)}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: 'primary.main',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: 'primary.main',
                          },
                        }}
                      />
                    }
                    label="Preview"
                    sx={{ 
                      '& .MuiTypography-root': { 
                        fontSize: '0.813rem',
                        color: 'text.secondary',
                        fontWeight: 500
                      } 
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={lesson.is_published}
                        onChange={(e) => handleToggleStatus(lesson, 'is_published', e.target.checked)}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: 'success.main',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: 'success.main',
                          },
                        }}
                      />
                    }
                    label="Published"
                    sx={{ 
                      '& .MuiTypography-root': { 
                        fontSize: '0.813rem',
                        color: 'text.secondary',
                        fontWeight: 500
                      } 
                    }}
                  />
                </Box>
                <Box sx={{ 
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 2,
                  mt: 2,
                  pt: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  opacity: 0,
                  transition: 'opacity 0.2s ease-in-out',
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 28,
                  backgroundColor: 'background.paper',
                  '.MuiCard-root:hover &': {
                    opacity: 1
                  }
                }}>
                  <Button
                    size="small"
                    onClick={() => handleShowUsers(lesson)}
                    sx={{
                      color: 'primary.main',
                      '&:hover': {
                        backgroundColor: 'primary.lighter'
                      }
                    }}
                  >
                    View Users
                  </Button>
                  <Button
                    size="small"
                    onClick={() => window.open(`/#/lessons?lesson_hash=${lesson.hash}&is_preview=true`, '_blank')}
                    sx={{
                      color: 'secondary.main',
                      '&:hover': {
                        backgroundColor: 'secondary.lighter'
                      }
                    }}
                  >
                    Preview
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {lessons.length === 0 && (
        <Box 
          sx={{ 
            mt: 4, 
            textAlign: 'center',
            py: 8,
            backgroundColor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1
          }}
        >
          <Typography 
            color="textSecondary"
            sx={{ fontSize: '1.1rem' }}
          >
            No lessons found
          </Typography>
        </Box>
      )}

      {lessons.length > 0 && (
        <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
          <Pagination 
            count={pagination.totalPages}
            page={pagination.page}
            onChange={handlePageChange}
            color="primary"
            showFirstButton 
            showLastButton
            size="large"
            sx={{
              '& .MuiPaginationItem-root': {
                '&:hover': {
                  backgroundColor: 'primary.lighter'
                }
              }
            }}
          />
        </Box>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? 'Edit Lesson' : 'Create New Lesson'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: 1,
              p: 2,
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 1
            }}>
              {lessonForm.thumbnail_path ? (
                <Box
                  component="img"
                  src={`${lessonForm.thumbnail_path}`}
                  alt="Lesson thumbnail"
                  sx={{
                    width: '100%',
                    maxHeight: 200,
                    objectFit: 'cover',
                    borderRadius: 1,
                    mb: 1
                  }}
                />
              ) : (
                <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
              )}
              <Button
                component="label"
                variant="outlined"
                size="small"
                sx={{ position: 'relative' }}
              >
                {lessonForm.thumbnail_path ? 'Change Image' : 'Upload Image'}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </Button>
              {lessonForm.thumbnail_path && (
                <Typography variant="caption" color="text.secondary">
                  Image uploaded successfully
                </Typography>
              )}
            </Box>

            <TextField
              label="Title"
              fullWidth
              value={lessonForm.title}
              onChange={(e) => handleFormChange('title', e.target.value)}
            />
            <FormControl fullWidth>
              <InputLabel>Lesson Type</InputLabel>
              <Select
                value={lessonForm.lesson_type}
                label="Lesson Type"
                onChange={(e) => handleFormChange('lesson_type', e.target.value)}
              >
                {LESSON_TYPES.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={lessonForm.description || ''}
              onChange={(e) => handleFormChange('description', e.target.value)}
            />
            <TextField
              label="Target"
              fullWidth
              multiline
              rows={3}
              value={lessonForm.target || ''}
              onChange={(e) => handleFormChange('target', e.target.value)}
            />
            <TextField
              label="Duration (minutes)"
              type="number"
              fullWidth
              value={lessonForm.duration_minutes || ''}
              onChange={(e) => handleFormChange('duration_minutes', parseInt(e.target.value) || '')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={showUsers} 
        onClose={handleCloseUsers}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          User Statistics - {selectedLesson?.title}
        </DialogTitle>
        <DialogContent>
          {selectedLesson && <LessonUsers lessonHash={selectedLesson.hash} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUsers}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Confirm Deletion"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this lesson?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Notify
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      />
    </Container>
  );
};

export default Lessons;
